package com.smarthire.tenant.assessment.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.enums.*;
import com.smarthire.domain.tenant.entity.*;
import com.smarthire.domain.tenant.repository.*;
import com.smarthire.tenant.assessment.dto.request.AssessmentConfigRequest;
import com.smarthire.tenant.assessment.dto.request.QuestionRequest;
import com.smarthire.tenant.assessment.dto.response.JobTestResponse;
import com.smarthire.tenant.assessment.mapper.AssessmentMapper;
import com.smarthire.tenant.cv.service.CvAccess;
import com.smarthire.tenant.notification.service.NotificationPreferenceService;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Propagation;

@Service
public class AssessmentGenerationService {
    public record AutomationStatus(int eligible, int generated, int pending, boolean bankReady, String bankError) {}
    private final JobRepository jobs;
    private final JobTestRepository tests;
    private final JobSkillRepository skills;
    private final QuestionRepository questions;
    private final OptionRepository options;
    private final ApplicationRepository applications;
    private final AiInterviewRepository interviews;
    private final NotificationRepository notifications;
    private final EmailOutboxRepository outbox;
    private final CvAccess access;
    private final AssessmentMapper mapper;
    private final ObjectMapper json;
    private final NotificationPreferenceService preferences;

    public AssessmentGenerationService(JobRepository jobs, JobTestRepository tests, JobSkillRepository skills,
            QuestionRepository questions, OptionRepository options, ApplicationRepository applications,
            AiInterviewRepository interviews, NotificationRepository notifications, EmailOutboxRepository outbox,
            CvAccess access, AssessmentMapper mapper, ObjectMapper json, NotificationPreferenceService preferences) {
        this.jobs = jobs; this.tests = tests; this.skills = skills; this.questions = questions; this.options = options;
        this.applications = applications; this.interviews = interviews; this.notifications = notifications;
        this.outbox = outbox; this.access = access; this.mapper = mapper; this.json = json; this.preferences = preferences;
    }

    @Transactional(readOnly = true)
    public AssessmentConfigRequest config(long jobId) {
        Job job = staffJob(jobId);
        return readConfig(job);
    }

    @Transactional(readOnly = true)
    public AutomationStatus status(long jobId) {
        Job job = staffJob(jobId);
        var config = readConfig(job);
        var eligible = eligibleApplications(jobId).stream()
                .filter(id -> interviews.existsByApplication_IdAndStatus(id, AiInterviewStatus.PASSED)).toList();
        int generated = (int) eligible.stream().filter(tests::existsByAssignedApplication_Id).count();
        String error = null;
        if (config != null) {
            try { select(job, config); } catch (BusinessException ex) { error = ex.getMessage(); }
        }
        return new AutomationStatus(eligible.size(), generated, eligible.size() - generated, config != null && error == null, error);
    }

    @Transactional
    public AssessmentConfigRequest saveConfig(long jobId, AssessmentConfigRequest config) {
        Job job = staffJob(jobId);
        validate(job, config);
        // Enabling automation must not silently accept an unusable question bank.
        if (config.autoAssign()) select(job, config);
        job.setAssessmentConfigJson(json.valueToTree(config));
        return config;
    }

    @Transactional
    public JobTestResponse generate(long jobId) {
        Job job = staffJob(jobId);
        var config = readConfig(job);
        if (config == null) throw invalid("Save the assessment structure first");
        return mapper.response(create(job, config, null, access.actor()));
    }

    @Transactional(readOnly = true)
    public List<Long> eligibleApplications(long jobId) {
        return applications.findByJob_IdOrderByIdDesc(jobId).stream()
                .filter(a -> a.getStatus() == ApplicationStatus.ASSESSMENT && a.getArchivedAt() == null && a.getWithdrawnAt() == null)
                .map(Application::getId).toList();
    }

    @Transactional(readOnly = true)
    public List<Long> pending() {
        var ids = new ArrayList<Long>();
        for (var job : jobs.findByDeletedAtIsNullOrderByIdDesc()) {
            var config = readConfig(job);
            if (config == null || !config.autoAssign()) continue;
            for (var id : eligibleApplications(job.getId())) {
                if (!tests.existsByAssignedApplication_Id(id)
                        && interviews.existsByApplication_IdAndStatus(id, AiInterviewStatus.PASSED)) ids.add(id);
                if (ids.size() == 50) return ids;
            }
        }
        return ids;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean generateForApplication(long id) {
        var application = applications.findByIdForUpdate(id).orElse(null);
        if (application == null || application.getStatus() != ApplicationStatus.ASSESSMENT
                || application.getArchivedAt() != null || application.getWithdrawnAt() != null
                || application.getJob().getDeletedAt() != null || tests.existsByAssignedApplication_Id(id)) return false;
        var config = readConfig(application.getJob());
        if (config == null || !config.autoAssign()
                || !interviews.existsByApplication_IdAndStatus(id, AiInterviewStatus.PASSED)) return false;
        JobTest test = create(application.getJob(), config, application, application.getJob().getCreatedBy());
        String path = "/candidate/assessments?applicationId=" + id;
        String title = "Bài Assessment đã sẵn sàng";
        String body = "Bạn đã vượt qua AI Interview cho vị trí " + test.getJob().getTitle()
                + ". Bài \"" + test.getTitle() + "\" đã được tạo riêng cho bạn. Thời gian làm bài "
                + test.getDurationMinutes() + " phút, tính từ lúc bắt đầu.";
        if (!preferences.webOff(application.getCandidate(), NotificationCategory.ASSESSMENT)) {
            notifications.save(Notification.builder().candidate(application.getCandidate()).type("ASSESSMENT_INVITATION")
                    .title(title).body(body).payloadJson("{\"testId\":" + test.getId() + ",\"applicationId\":" + id
                            + ",\"path\":\"" + path + "\"}").build());
        }
        if (application.getCandidate().getEmail() != null && !application.getCandidate().getEmail().isBlank()
                && !preferences.emailOff(application.getCandidate(), NotificationCategory.ASSESSMENT)) {
            outbox.save(EmailOutbox.builder().purpose("ASSESSMENT_INVITATION")
                    .toEmail(application.getCandidate().getEmail()).subject(title + " — " + test.getJob().getTitle())
                    .body(body + "\n\nĐăng nhập vào workspace để mở mục Bài đánh giá.")
                    .status(NotificationStatus.PENDING).attempts(0).build());
        }
        return true;
    }

    private JobTest create(Job job, AssessmentConfigRequest config, Application application, User creator) {
        var selected = select(job, config);
        int total = config.sections().stream().mapToInt(s -> s.count() * s.points()).sum();
        String title = "Assessment — " + job.getTitle();
        title = title.substring(0, Math.min(title.length(), 180));
        if (application != null) title += " — HS " + application.getId();
        var test = JobTest.builder().job(job).assignedApplication(application).createdBy(creator)
                .title(title + " — " + Instant.now().toString().substring(0, 16))
                .description("Tạo tự động từ ngân hàng câu hỏi theo cấu hình của job.")
                .durationMinutes(config.durationMinutes())
                .passingScore(BigDecimal.valueOf(total).multiply(BigDecimal.valueOf(config.passingPercent()))
                        .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP))
                .status(application == null ? TestStatus.DRAFT : TestStatus.PUBLISHED).build();
        tests.save(test);
        int order = 0;
        for (var selection : selected) {
            var source = selection.source();
            var copy = Question.builder().test(test).questionText(source.getQuestionText())
                    .questionType(source.getQuestionType()).difficulty(source.getDifficulty()).skill(source.getSkill())
                    .explanation(source.getExplanation()).points(selection.points()).questionOrder(order++)
                    .authoringMetadata(source.getAuthoringMetadata() == null ? null : source.getAuthoringMetadata().deepCopy()).build();
            questions.save(copy);
            for (var option : options.findByQuestion_IdOrderByIdAsc(source.getId())) {
                options.save(Option.builder().question(copy).optionText(option.getOptionText()).correct(option.isCorrect()).build());
            }
        }
        return test;
    }

    private record Selected(Question source, int points) {}

    private List<Selected> select(Job job, AssessmentConfigRequest config) {
        validate(job, config);
        var pool = new ArrayList<>(questions.findAll().stream().filter(q -> !q.isBankArchived()
                && (q.getTest() == null || q.getTest().getStatus() != TestStatus.ARCHIVED))
                .filter(q -> q.getTest() == null || q.getTest().getAssignedApplication() == null).toList());
        Collections.shuffle(pool);
        var selected = new ArrayList<Selected>();
        var used = new HashSet<String>();
        for (var section : config.sections()) {
            int count = 0;
            for (var question : pool) {
                String content = question.getQuestionText().trim().toLowerCase(Locale.ROOT);
                if (used.contains(content) || !section.skill().trim().equalsIgnoreCase(question.getSkill())
                        || !section.difficulty().equalsIgnoreCase(question.getDifficulty())
                        || !section.questionType().name().equals(question.getQuestionType())) continue;
                var choices = options.findByQuestion_IdOrderByIdAsc(question.getId()).stream()
                        .map(o -> new QuestionRequest.OptionRequest(o.getOptionText(), o.isCorrect())).toList();
                try {
                    QuestionService.validateOptions(new QuestionRequest(question.getQuestionText(), section.points(), 0,
                            question.getDifficulty(), question.getSkill(), question.getExplanation(), choices, section.questionType()));
                } catch (BusinessException invalidSource) { continue; }
                used.add(content); selected.add(new Selected(question, section.points()));
                if (++count == section.count()) break;
            }
            if (count < section.count()) throw new BusinessException("Not enough questions: " + section.skill()
                    + " / " + section.questionType() + " / " + section.difficulty() + " (" + count + "/" + section.count() + ")",
                    HttpStatus.CONFLICT, "ASSESSMENT_BANK_INSUFFICIENT");
        }
        return selected;
    }

    private void validate(Job job, AssessmentConfigRequest config) {
        var names = skills.findByJob_IdOrderByIdAsc(job.getId()).stream().map(s -> s.getSkill().getName().trim().toLowerCase(Locale.ROOT)).toList();
        if (config.sections() == null || config.sections().isEmpty()
                || config.sections().stream().mapToInt(AssessmentConfigRequest.Section::count).sum() > 100) {
            throw invalid("Assessment requires 1 to 100 questions");
        }
        for (var section : config.sections()) {
            if (!names.contains(section.skill().trim().toLowerCase(Locale.ROOT))) throw invalid("Skill does not belong to job: " + section.skill());
        }
    }

    private AssessmentConfigRequest readConfig(Job job) {
        return job.getAssessmentConfigJson() == null ? null : json.convertValue(job.getAssessmentConfigJson(), AssessmentConfigRequest.class);
    }

    private Job staffJob(long id) {
        if (!access.staff()) throw new BusinessException("Staff access required", HttpStatus.FORBIDDEN, "ASSESSMENT_FORBIDDEN");
        access.actor();
        var job = jobs.findById(id).orElseThrow(() -> new BusinessException("Job not found", HttpStatus.NOT_FOUND, "JOB_NOT_FOUND"));
        access.requireJob(job);
        if (job.getDeletedAt() != null) throw invalid("Job is unavailable");
        return job;
    }

    private BusinessException invalid(String message) {
        return new BusinessException(message, HttpStatus.BAD_REQUEST, "ASSESSMENT_CONFIG_INVALID");
    }
}
