package com.smarthire.tenant.aiInterview.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.smarthire.domain.enums.*;
import com.smarthire.domain.tenant.entity.*;
import com.smarthire.domain.tenant.repository.*;
import com.smarthire.tenant.aiInterview.ai.AiInterviewClient;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AiInterviewEvaluationService {
    private static final Logger log = LoggerFactory.getLogger(AiInterviewEvaluationService.class);
    static final int MIN_QUESTIONS = 5;
    static final int MAX_QUESTIONS = 5;
    // Small batches keep every provider response well inside the model output limit.
    static final int QUESTION_BATCH = 10;
    static final int EVALUATION_BATCH = 10;
    private static final Set<String> QUESTION_TYPES = Set.of("TECHNICAL", "SITUATIONAL", "BEHAVIORAL");
    private static final String GENERATE_INSTRUCTION = "Generate exactly questionCount Vietnamese interview questions for"
            + " this job, based on jobDescription, responsibilities, requirements and jobSkills (and candidateEvidence when"
            + " present). Mostly TECHNICAL questions on the required skills; some SITUATIONAL or BEHAVIORAL questions about"
            + " applying them in this role are allowed. Never repeat or paraphrase any item of alreadyAskedQuestions."
            + " Return {\"questions\":[{\"questionText\":\"...\",\"questionType\":\"TECHNICAL|SITUATIONAL|BEHAVIORAL\"}]}."
            + " Do not include answers.";
    private static final String EVALUATE_INSTRUCTION = "Evaluate each answer using correctness (50%), job relevance (30%),"
            + " clarity and reasoning (20%). Use score 0-100 for each answer. Return exactly one evaluation for every answerId:"
            + " {\"evaluations\":[{\"answerId\":1,\"score\":78,\"feedback\":\"...\",\"strengths\":\"...\",\"weaknesses\":\"...\"}]}.";

    private final AiInterviewRepository interviews;
    private final AiQuestionRepository questions;
    private final AiAnswerRepository answers;
    private final AiFeedbackRepository feedbacks;
    private final JobSkillRepository skills;
    private final CvRepository cvs;
    private final CvExtractionRepository extractions;
    private final ApplicationStatusHistoryRepository history;
    private final RecruitmentStageRepository stages;
    private final NotificationRepository notifications;
    private final EmailOutboxRepository emails;
    private final JobTestRepository tests;
    private final AiInterviewClient ai;
    private final ObjectMapper mapper;
    private final AiInterviewActivityLog activity;

    public AiInterviewEvaluationService(AiInterviewRepository interviews, AiQuestionRepository questions,
            AiAnswerRepository answers, AiFeedbackRepository feedbacks, JobSkillRepository skills, CvRepository cvs,
            CvExtractionRepository extractions, ApplicationStatusHistoryRepository history, RecruitmentStageRepository stages,
            NotificationRepository notifications, EmailOutboxRepository emails, JobTestRepository tests,
            AiInterviewClient ai, ObjectMapper mapper, AiInterviewActivityLog activity) {
        this.interviews = interviews; this.questions = questions; this.answers = answers; this.feedbacks = feedbacks;
        this.skills = skills; this.cvs = cvs; this.extractions = extractions; this.history = history; this.stages = stages;
        this.notifications = notifications; this.emails = emails; this.tests = tests; this.ai = ai; this.mapper = mapper;
        this.activity = activity;
    }

    @Transactional
    public void process(long id) {
        var interview = interviews.findByIdForUpdate(id).orElse(null);
        if (interview == null || interview.getStatus() != AiInterviewStatus.GENERATING
                && interview.getStatus() != AiInterviewStatus.SCORING) return;
        AiInterviewStatus phase = interview.getStatus();
        try {
            AiInterviewEligibility.require(interview.getApplication());
            if (phase == AiInterviewStatus.GENERATING) generate(interview);
            else evaluate(interview);
            interview.setErrorMessage(null);
        } catch (IllegalStateException | com.smarthire.common.exception.BusinessException ex) {
            interview.setStatus(AiInterviewStatus.ERROR);
            interview.setErrorMessage(ex instanceof AiInterviewClient.ProviderException ? ex.getMessage()
                    : "Không thể xử lý AI Interview. Kiểm tra cấu hình và thử lại.");
            // Messages here are our own validation texts; provider errors are already sanitized by AiInterviewClient.
            activity.record(interview, phase == AiInterviewStatus.GENERATING ? "GENERATION_FAILED" : "EVALUATION_FAILED",
                    ex.getMessage());
        }
    }

    private ObjectNode context(Application application) {
        Job job = application.getJob();
        ObjectNode data = mapper.createObjectNode();
        data.put("jobTitle", job.getTitle()); data.put("jobDescription", job.getDescription());
        data.put("responsibilities", job.getResponsibilities()); data.put("educationRequirement", job.getEducationLevel());
        data.put("minimumYearsExperience", job.getMinYearsExperience());
        var requiredSkills = data.putArray("jobSkills");
        for (var skill : skills.findByJob_IdOrderByIdAsc(job.getId())) {
            requiredSkills.addObject().put("name", skill.getSkill().getName()).put("required", skill.isRequired());
        }
        var documents = cvs.findByApplication_IdOrderByIdDesc(application.getId());
        if (!documents.isEmpty()) extractions.findByCv_Id(documents.getFirst().getId()).ifPresent(extraction -> {
            try {
                var cv = mapper.readTree(extraction.getExtractionJson());
                var profile = data.putObject("candidateEvidence");
                for (String field : List.of("skills", "experience", "education", "projects", "certifications")) {
                    if (cv.has(field)) profile.set(field, cv.get(field));
                }
            } catch (Exception ignored) { /* Missing optional CV evidence does not invent a profile. */ }
        });
        return data;
    }

    private void generate(AiInterview interview) {
        if (!questions.findByAiInterview_IdOrderByQuestionOrderAscIdAsc(interview.getId()).isEmpty()) {
            throw new IllegalStateException("Questions already exist");
        }
        int target = Math.clamp(interview.getApplication().getJob().getAiInterviewQuestionCount(), MIN_QUESTIONS, MAX_QUESTIONS);
        var data = context(interview.getApplication());
        List<AiQuestion> generated = new ArrayList<>();
        Set<String> seen = new HashSet<>();
        int maxCalls = (target + QUESTION_BATCH - 1) / QUESTION_BATCH + 2;
        for (int call = 1; generated.size() < target && call <= maxCalls; call++) {
            int need = Math.min(QUESTION_BATCH, target - generated.size());
            var request = data.deepCopy();
            request.put("questionCount", need);
            var asked = request.putArray("alreadyAskedQuestions");
            generated.forEach(q -> asked.add(q.getQuestionText()));
            int added = 0;
            JsonNode output = ai.generate(GENERATE_INSTRUCTION, request);
            log.info("AI interview {} generation call {} returned JSON:\n{}", interview.getId(), call, output.toPrettyString());
            for (JsonNode row : output.path("questions")) {
                if (added == need) break;
                String text = row.path("questionText").asText("").trim();
                if (text.isEmpty() || text.length() > 10000 || !seen.add(text.toLowerCase(Locale.ROOT))) continue;
                String type = row.path("questionType").asText("").trim().toUpperCase(Locale.ROOT);
                generated.add(AiQuestion.builder().aiInterview(interview).questionText(text)
                        .questionType(QUESTION_TYPES.contains(type) ? type : "TECHNICAL")
                        .questionOrder(generated.size()).build());
                added++;
            }
            activity.record(interview, "QUESTIONS_BATCH_GENERATED",
                    "Call " + call + ": +" + added + " questions (" + generated.size() + "/" + target + ")");
        }
        if (generated.size() < target) {
            throw new IllegalStateException("Generated " + generated.size() + "/" + target + " questions");
        }
        questions.saveAll(generated);
        interview.setStatus(AiInterviewStatus.QUESTIONS_READY);
        activity.record(interview, "QUESTIONS_GENERATED", generated.size() + " questions saved");
        notify(interview, "AI_INTERVIEW_READY", "AI Interview đã sẵn sàng",
                "Bộ " + generated.size() + " câu hỏi phỏng vấn cho vị trí " + interview.getApplication().getJob().getTitle()
                        + " đã sẵn sàng. Bạn có thể bắt đầu AI Interview.", false);
    }

    private void evaluate(AiInterview interview) {
        var paper = questions.findByAiInterview_IdOrderByQuestionOrderAscIdAsc(interview.getId());
        var saved = new ArrayList<>(answers.findByAiQuestion_IdIn(paper.stream().map(AiQuestion::getId).toList()));
        if (paper.isEmpty() || saved.size() != paper.size() || interview.getPassingScoreSnapshot() == null
                || saved.stream().anyMatch(a -> a.getAnswerText() == null || a.getAnswerText().isBlank())) {
            throw new IllegalStateException("Incomplete interview");
        }
        saved.sort(Comparator.comparingInt(a -> a.getAiQuestion().getQuestionOrder()));
        var data = context(interview.getApplication());
        List<AiFeedback> validated = new ArrayList<>();
        for (int from = 0; from < saved.size(); from += EVALUATION_BATCH) {
            var chunk = saved.subList(from, Math.min(from + EVALUATION_BATCH, saved.size()));
            var request = data.deepCopy();
            var payload = request.putArray("answers");
            for (var answer : chunk) payload.addObject().put("answerId", answer.getId())
                    .put("question", answer.getAiQuestion().getQuestionText()).put("answer", answer.getAnswerText());
            validated.addAll(validate(ai.generate(EVALUATE_INSTRUCTION, request).path("evaluations"), chunk));
            activity.record(interview, "ANSWERS_BATCH_EVALUATED", validated.size() + "/" + saved.size() + " answers evaluated");
        }
        BigDecimal total = validated.stream().map(AiFeedback::getScore).reduce(BigDecimal.ZERO, BigDecimal::add)
                .divide(BigDecimal.valueOf(validated.size()), 2, RoundingMode.HALF_UP);
        // Validate the whole provider result before any evaluation or outcome is persisted.
        feedbacks.saveAll(validated);
        activity.record(interview, "FEEDBACK_SAVED", validated.size() + " AI feedbacks saved; interview score " + total + "/100");
        finish(interview, total);
    }

    List<AiFeedback> validate(JsonNode output, List<AiAnswer> saved) {
        if (!output.isArray() || output.size() != saved.size()) throw new IllegalStateException("Invalid evaluation count");
        Map<Long, AiAnswer> byId = new HashMap<>();
        saved.forEach(answer -> byId.put(answer.getId(), answer));
        List<AiFeedback> result = new ArrayList<>();
        for (JsonNode row : output) {
            if (!row.path("answerId").isIntegralNumber() || !row.path("score").isNumber()) throw new IllegalStateException("Invalid evaluation");
            var answer = byId.remove(row.path("answerId").longValue());
            var score = row.path("score").decimalValue();
            if (answer == null || score.signum() < 0 || score.compareTo(new BigDecimal("100")) > 0) throw new IllegalStateException("Invalid evaluation");
            var feedback = feedbacks.findByAiAnswer_Id(answer.getId()).orElseGet(() -> AiFeedback.builder().aiAnswer(answer).build());
            feedback.setScore(score.setScale(2, RoundingMode.HALF_UP));
            feedback.setFeedbackText(requiredText(row, "feedback", 10000));
            feedback.setStrengths(requiredText(row, "strengths", 10000));
            feedback.setWeaknesses(requiredText(row, "weaknesses", 10000));
            result.add(feedback);
        }
        return result;
    }

    private String requiredText(JsonNode row, String key, int max) {
        var value = row.path(key);
        if (!value.isTextual() || value.asText().isBlank() || value.asText().length() > max) throw new IllegalStateException("Invalid AI text");
        return value.asText();
    }

    void finish(AiInterview interview, BigDecimal score) {
        boolean passed = score.compareTo(interview.getPassingScoreSnapshot()) >= 0;
        interview.setOverallScore(score);
        interview.setStatus(passed ? AiInterviewStatus.PASSED : AiInterviewStatus.FAILED);
        activity.record(interview, passed ? "PASSED" : "FAILED",
                "Score " + score + "/100; passing score " + interview.getPassingScoreSnapshot());
        var application = interview.getApplication();
        ApplicationStatus previous = application.getStatus();
        ApplicationStatus next = passed ? ApplicationStatus.ASSESSMENT : ApplicationStatus.FAILED;
        var row = new ApplicationStatusHistory();
        row.setApplication(application); row.setFromStatus(previous.name()); row.setToStatus(next.name());
        row.setNote("AI Interview " + interview.getStatus() + ": " + score + "/100; passing score " + interview.getPassingScoreSnapshot());
        history.save(row);
        application.setStatus(next);
        if (passed) stages.findByJob_IdOrderBySortOrderAsc(application.getJob().getId()).stream()
                .filter(stage -> "Assessment".equalsIgnoreCase(stage.getName())).findFirst().ifPresent(application::setStage);
        activity.record(interview, "APPLICATION_STATUS_CHANGED", previous + " -> " + next + "; stage history saved");
        boolean assessmentReady = passed && !tests.findByJob_IdAndStatusOrderByIdDesc(application.getJob().getId(), TestStatus.PUBLISHED).isEmpty();
        if (passed) {
            activity.record(interview, "ASSESSMENT_UNLOCKED", assessmentReady
                    ? "Published assessment available to candidate" : "Assessment round opened; no published test yet");
        }
        String body = "Kết quả AI Interview cho vị trí " + application.getJob().getTitle() + ": " + score + "/100. "
                + (passed ? assessmentReady ? "Bạn đã vượt qua AI Interview. Assessment đã sẵn sàng."
                        : "Bạn đã vượt qua AI Interview. Vòng Assessment đã được mở; nhà tuyển dụng đang chuẩn bị đề."
                        : "Bạn chưa đạt ngưỡng " + interview.getPassingScoreSnapshot() + "/100. Hồ sơ kết thúc ở vòng AI Interview.");
        notify(interview, passed ? "AI_INTERVIEW_PASSED" : "AI_INTERVIEW_FAILED", "Kết quả AI Interview", body, true);
    }

    private void notify(AiInterview interview, String type, String title, String body, boolean email) {
        var app = interview.getApplication();
        String path = type.equals("AI_INTERVIEW_PASSED") ? "/candidate/assessments" : "/candidate/interviews/" + interview.getId();
        notifications.save(Notification.builder().user(app.getCandidate()).type(type).title(title).body(body)
                .payloadJson("{\"path\":\"" + path + "\",\"applicationId\":" + app.getId() + "}").build());
        activity.record(interview, "NOTIFICATION_SENT", type);
        if (email) {
            emails.save(EmailOutbox.builder().purpose("AI_INTERVIEW_RESULT").toEmail(app.getCandidate().getEmail()).subject(title).body(body).build());
            activity.record(interview, "EMAIL_QUEUED", "AI_INTERVIEW_RESULT");
        }
    }
}
