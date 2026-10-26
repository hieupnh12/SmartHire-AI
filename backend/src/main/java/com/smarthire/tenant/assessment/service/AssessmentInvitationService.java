package com.smarthire.tenant.assessment.service;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.enums.ApplicationStatus;
import com.smarthire.domain.enums.NotificationCategory;
import com.smarthire.domain.enums.NotificationStatus;
import com.smarthire.domain.enums.TestStatus;
import com.smarthire.domain.enums.TestSubmissionStatus;
import com.smarthire.domain.tenant.entity.Application;
import com.smarthire.domain.tenant.entity.ApplicationStatusHistory;
import com.smarthire.domain.tenant.entity.Candidate;
import com.smarthire.domain.tenant.entity.EmailOutbox;
import com.smarthire.domain.tenant.entity.Job;
import com.smarthire.domain.tenant.entity.JobTest;
import com.smarthire.domain.tenant.entity.Notification;
import com.smarthire.domain.tenant.entity.*;
import com.smarthire.domain.tenant.repository.*;
import com.smarthire.multitenancy.service.TenantPublicUrlService;
import com.smarthire.tenant.assessment.dto.request.SendAssessmentRequest;
import com.smarthire.tenant.assessment.dto.response.SendAssessmentResponse;
import com.smarthire.tenant.auth.service.InviteMailSender;
import com.smarthire.tenant.cv.service.CvAccess;
import com.smarthire.tenant.notification.service.NotificationPreferenceService;
import java.time.Instant;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AssessmentInvitationService {
    private static final Logger log = LoggerFactory.getLogger(AssessmentInvitationService.class);
    private static final Set<ApplicationStatus> SENDABLE = Set.of(ApplicationStatus.INTERVIEW, ApplicationStatus.ASSESSMENT);
    private static final Set<TestSubmissionStatus> COMPLETED =
            Set.of(TestSubmissionStatus.SUBMITTED, TestSubmissionStatus.GRADED, TestSubmissionStatus.EXPIRED);

    private final JobTestRepository tests;
    private final ApplicationRepository applications;
    private final SubmissionRepository submissions;
    private final ApplicationStatusHistoryRepository history;
    private final RecruitmentStageRepository stages;
    private final NotificationRepository notifications;
    private final EmailOutboxRepository outbox;
    private final InviteMailSender mail;
    private final TenantPublicUrlService publicUrls;
    private final CvAccess access;
    private final NotificationPreferenceService preferences;
    private final AssessmentDemoSeedService demoSeed;

    @org.springframework.beans.factory.annotation.Autowired
    private QuestionRepository questions;
    @org.springframework.beans.factory.annotation.Autowired
    private OptionRepository options;
    @org.springframework.beans.factory.annotation.Autowired
    private CodingProblemRepository codingProblems;
    @org.springframework.beans.factory.annotation.Autowired
    private TestCaseRepository testCases;

    public AssessmentInvitationService(JobTestRepository tests, ApplicationRepository applications,
            SubmissionRepository submissions,
            ApplicationStatusHistoryRepository history, RecruitmentStageRepository stages,
            NotificationRepository notifications, EmailOutboxRepository outbox, InviteMailSender mail,
            TenantPublicUrlService publicUrls, CvAccess access, NotificationPreferenceService preferences,
            AssessmentDemoSeedService demoSeed) {
        this.preferences = preferences;
        this.tests = tests;
        this.applications = applications;
        this.submissions = submissions;
        this.history = history;
        this.stages = stages;
        this.notifications = notifications;
        this.outbox = outbox;
        this.mail = mail;
        this.publicUrls = publicUrls;
        this.access = access;
        this.demoSeed = demoSeed;
    }

    /** System invite after CV pass: ensure fixed demo paper exists and notify the candidate. */
    @Transactional
    public SendAssessmentResponse inviteFixedDemoAfterCvPass(Application application) {
        if (application.getArchivedAt() != null || application.getWithdrawnAt() != null
                || !SENDABLE.contains(application.getStatus())) {
            throw conflict("Application is not eligible for assessment", "APPLICATION_NOT_ELIGIBLE");
        }
        JobTest test = demoSeed.ensurePublishedDemo(application.getJob());
        return notifyCandidate(application, test, application.getJob().getCreatedBy(),
                "Bạn đã vượt vòng lọc CV cho vị trí " + application.getJob().getTitle()
                        + ". Bài \"" + test.getTitle() + "\" đã sẵn sàng. Thời gian làm bài "
                        + test.getDurationMinutes() + " phút, bắt đầu tính khi bạn bấm bắt đầu.");
    }

    @Transactional
    public SendAssessmentResponse send(long testId, SendAssessmentRequest request) {
        if (!access.staff()) {
            throw new BusinessException("Staff access required", HttpStatus.FORBIDDEN, "ASSESSMENT_FORBIDDEN");
        }
        User actor = access.actor();
        JobTest test = tests.findById(testId).orElseThrow(() -> notFound("Test"));
        access.requireJob(test.getJob());
        if (test.getStatus() != TestStatus.PUBLISHED || test.getJob().getDeletedAt() != null) {
            throw conflict("Only published tests can be sent", "TEST_UNAVAILABLE");
        }
        Application application = applications.findByIdForUpdate(request.applicationId())
                .orElseThrow(() -> notFound("Application"));
        if (!application.getJob().getId().equals(test.getJob().getId())) {
            throw conflict("Application does not belong to the test job", "APPLICATION_JOB_MISMATCH");
        }
        if (test.getAssignedApplication() == null || !test.getAssignedApplication().getId().equals(application.getId())) {
            throw conflict("Only the paper assigned to this application can be sent", "ASSESSMENT_NOT_ASSIGNED");
        }
        if (application.getArchivedAt() != null || application.getWithdrawnAt() != null
                || !SENDABLE.contains(application.getStatus())) {
            throw conflict("Application is not eligible for assessment", "APPLICATION_NOT_ELIGIBLE");
        }
        var latest = submissions.findLatestIds(testId, application.getId(), PageRequest.of(0, 1));
        if (!AssessmentDemoSeedService.DEMO_TITLE.equals(test.getTitle())
                && !latest.isEmpty() && submissions.findById(latest.getFirst())
                .map(s -> COMPLETED.contains(s.getStatus())).orElse(false)) {
            throw conflict("Candidate already completed this assessment", "ASSESSMENT_ALREADY_COMPLETED");
        }

        if (application.getStatus() != ApplicationStatus.ASSESSMENT) {
            ApplicationStatusHistory row = new ApplicationStatusHistory();
            row.setApplication(application);
            row.setFromStatus(application.getStatus().name());
            row.setToStatus(ApplicationStatus.ASSESSMENT.name());
            row.setChangedBy(actor.getId());
            row.setNote("Assessment sent: " + test.getTitle());
            history.save(row);
            application.setStatus(ApplicationStatus.ASSESSMENT);
            stages.findByJob_IdOrderBySortOrderAsc(application.getJob().getId()).stream()
                    .filter(stage -> "Assessment".equalsIgnoreCase(stage.getName())).findFirst()
                    .ifPresent(application::setStage);
        }

        return notifyCandidate(application, test, actor,
                "Nhà tuyển dụng mời bạn làm bài \"" + test.getTitle() + "\" cho vị trí " + application.getJob().getTitle()
                        + ". Thời gian làm bài " + test.getDurationMinutes() + " phút, bắt đầu tính khi bạn bấm bắt đầu.");
    }

    @Transactional
    public SendAssessmentResponse assignToApplication(long testId, long applicationId) {
        if (!access.staff()) {
            throw new BusinessException("Staff access required", HttpStatus.FORBIDDEN, "ASSESSMENT_FORBIDDEN");
        }
        User actor = access.actor();
        JobTest test = tests.findById(testId).orElseThrow(() -> notFound("Test"));
        access.requireJob(test.getJob());
        if (test.getStatus() != TestStatus.PUBLISHED || test.getJob().getDeletedAt() != null) {
            throw conflict("Only published tests can be assigned", "TEST_UNAVAILABLE");
        }
        Application application = applications.findByIdForUpdate(applicationId)
                .orElseThrow(() -> notFound("Application"));
        if (!application.getJob().getId().equals(test.getJob().getId())) {
            throw conflict("Application does not belong to the test job", "APPLICATION_JOB_MISMATCH");
        }
        if (application.getArchivedAt() != null || application.getWithdrawnAt() != null
                || !SENDABLE.contains(application.getStatus())) {
            throw conflict("Application is not eligible for assessment", "APPLICATION_NOT_ELIGIBLE");
        }

        // If this test is already assigned to this application, simply send/resend:
        if (test.getAssignedApplication() != null && test.getAssignedApplication().getId().equals(application.getId())) {
            return send(testId, new SendAssessmentRequest(applicationId));
        }

        // Check if application already has a dedicated test:
        var existing = tests.findByAssignedApplication_Id(applicationId);
        if (existing.isPresent()) {
            return send(existing.get().getId(), new SendAssessmentRequest(applicationId));
        }

        // Clone the published template test into a dedicated paper for this application:
        JobTest paper = JobTest.builder()
                .job(test.getJob())
                .assignedApplication(application)
                .createdBy(actor)
                .title(test.getTitle())
                .description(test.getDescription())
                .durationMinutes(test.getDurationMinutes())
                .objectiveDurationMinutes(test.getObjectiveDurationMinutes())
                .passingScore(test.getPassingScore())
                .status(TestStatus.PUBLISHED)
                .build();
        tests.save(paper);

        if (questions != null) {
            for (var q : questions.findByTest_IdOrderByQuestionOrderAscIdAsc(test.getId())) {
                Question qClone = new Question();
                qClone.setTest(paper);
                qClone.setQuestionText(q.getQuestionText());
                qClone.setQuestionType(q.getQuestionType());
                qClone.setDifficulty(q.getDifficulty());
                qClone.setSkill(q.getSkill());
                qClone.setQuestionOrder(q.getQuestionOrder());
                qClone.setPoints(q.getPoints());
                qClone.setExplanation(q.getExplanation());
                qClone.setRubricJson(q.getRubricJson());
                questions.save(qClone);
                if (options != null) {
                    for (var opt : options.findByQuestion_IdOrderByIdAsc(q.getId())) {
                        Option optClone = new Option();
                        optClone.setQuestion(qClone);
                        optClone.setOptionText(opt.getOptionText());
                        optClone.setCorrect(opt.isCorrect());
                        options.save(optClone);
                    }
                }
                if (codingProblems != null && q.getCodingProblem() != null) {
                    var cp = q.getCodingProblem();
                    CodingProblem cpClone = new CodingProblem();
                    cpClone.setTest(paper);
                    cpClone.setQuestion(qClone);
                    cpClone.setTitle(cp.getTitle());
                    cpClone.setPrompt(cp.getPrompt());
                    cpClone.setCategory(cp.getCategory());
                    cpClone.setTimeLimitMs(cp.getTimeLimitMs());
                    cpClone.setMemoryMb(cp.getMemoryMb());
                    cpClone.setStarterCodeJson(cp.getStarterCodeJson());
                    cpClone.setHarnessJson(cp.getHarnessJson());
                    codingProblems.save(cpClone);
                    if (testCases != null) {
                        for (var tc : cp.getTestCases()) {
                            TestCase tcClone = new TestCase();
                            tcClone.setCodingProblem(cpClone);
                            tcClone.setInputData(tc.getInputData());
                            tcClone.setExpectedOutput(tc.getExpectedOutput());
                            tcClone.setSample(tc.isSample());
                            tcClone.setWeight(tc.getWeight());
                            testCases.save(tcClone);
                        }
                    }
                }
            }
        }

        if (application.getStatus() != ApplicationStatus.ASSESSMENT) {
            ApplicationStatusHistory row = new ApplicationStatusHistory();
            row.setApplication(application);
            row.setFromStatus(application.getStatus().name());
            row.setToStatus(ApplicationStatus.ASSESSMENT.name());
            row.setChangedBy(actor.getId());
            row.setNote("Assessment assigned: " + paper.getTitle());
            history.save(row);
            application.setStatus(ApplicationStatus.ASSESSMENT);
            stages.findByJob_IdOrderBySortOrderAsc(application.getJob().getId()).stream()
                    .filter(stage -> "Assessment".equalsIgnoreCase(stage.getName())).findFirst()
                    .ifPresent(application::setStage);
        }

        return notifyCandidate(application, paper, actor,
                "Nhà tuyển dụng mời bạn làm bài \"" + paper.getTitle() + "\" cho vị trí " + application.getJob().getTitle()
                        + ". Thời gian làm bài " + paper.getDurationMinutes() + " phút, bắt đầu tính khi bạn bấm bắt đầu.");
    }


    private SendAssessmentResponse notifyCandidate(Application application, JobTest test, User actor, String body) {
        Candidate candidate = application.getCandidate();
        String jobTitle = application.getJob().getTitle();
        String path = "/assessments?applicationId=" + application.getId();
        String title = "Lời mời làm bài Assessment";
        if (!preferences.webOff(candidate, NotificationCategory.ASSESSMENT)) {
            notifications.save(Notification.builder()
                    .candidate(candidate)
                    .type("ASSESSMENT_INVITATION")
                    .title(title)
                    .body(body)
                    .payloadJson("{\"testId\":" + test.getId() + ",\"applicationId\":" + application.getId()
                            + ",\"path\":\"" + path + "\"}")
                    .build());
        }

        boolean emailSent = false;
        if (candidate.getEmail() != null && !candidate.getEmail().isBlank()
                && !preferences.emailOff(candidate, NotificationCategory.ASSESSMENT)) {
            String brand = TenantPublicUrlService.brandOrDefault(publicUrls);
            String subject = brand + ": mời làm bài Assessment — " + jobTitle;
            String emailBody = """
                    Xin chào %s,

                    %s
                    Vui lòng đăng nhập để làm bài:

                    %s

                    %s
                    """.formatted(
                    candidate.getFullName() == null ? candidate.getEmail() : candidate.getFullName(),
                    body,
                    publicUrls.path(path),
                    brand);
            User replyUser = resolveReplyUser(actor, test.getJob());
            String replyToEmail = replyUser != null ? replyUser.getEmail() : null;
            String replyToName = replyUser != null ? replyUser.getFullName() : null;
            emailSent = InviteMailSender.withReplyTo(
                    replyToEmail,
                    replyToName,
                    () -> mail.send(candidate.getEmail(), subject, emailBody));
            outbox.save(EmailOutbox.builder()
                    .purpose("ASSESSMENT_INVITATION")
                    .toEmail(candidate.getEmail())
                    .subject(subject)
                    .body(emailBody)
                    .status(emailSent ? NotificationStatus.SENT : NotificationStatus.FAILED)
                    .attempts(1)
                    .sentAt(emailSent ? Instant.now() : null)
                    .build());
            if (!emailSent) log.warn("Assessment invitation email was not delivered for application {}", application.getId());
        }
        return new SendAssessmentResponse(test.getId(), application.getId(), application.getStatus(), emailSent);
    }

    private static User resolveReplyUser(User actor, Job job) {
        if (actor != null && actor.getEmail() != null && !actor.getEmail().isBlank()) {
            return actor;
        }
        try {
            if (job != null && job.getCreatedBy() != null
                    && job.getCreatedBy().getEmail() != null
                    && !job.getCreatedBy().getEmail().isBlank()) {
                return job.getCreatedBy();
            }
        } catch (Exception ignored) {
            // Ignore lazy proxy errors
        }
        return null;
    }

    private BusinessException notFound(String resource) {
        return new BusinessException(resource + " not found", HttpStatus.NOT_FOUND, "ASSESSMENT_NOT_FOUND");
    }

    private BusinessException conflict(String message, String code) {
        return new BusinessException(message, HttpStatus.CONFLICT, code);
    }
}
