package com.smarthire.tenant.assessment.service;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.enums.AiInterviewStatus;
import com.smarthire.domain.enums.ApplicationStatus;
import com.smarthire.domain.enums.NotificationCategory;
import com.smarthire.domain.enums.NotificationStatus;
import com.smarthire.domain.enums.TestStatus;
import com.smarthire.domain.enums.TestSubmissionStatus;
import com.smarthire.domain.tenant.entity.Application;
import com.smarthire.domain.tenant.entity.ApplicationStatusHistory;
import com.smarthire.domain.tenant.entity.EmailOutbox;
import com.smarthire.domain.tenant.entity.JobTest;
import com.smarthire.domain.tenant.entity.Notification;
import com.smarthire.domain.tenant.entity.User;
import com.smarthire.domain.tenant.repository.AiInterviewRepository;
import com.smarthire.domain.tenant.repository.ApplicationRepository;
import com.smarthire.domain.tenant.repository.ApplicationStatusHistoryRepository;
import com.smarthire.domain.tenant.repository.EmailOutboxRepository;
import com.smarthire.domain.tenant.repository.JobTestRepository;
import com.smarthire.domain.tenant.repository.NotificationRepository;
import com.smarthire.domain.tenant.repository.RecruitmentStageRepository;
import com.smarthire.domain.tenant.repository.SubmissionRepository;
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
    private final AiInterviewRepository aiInterviews;
    private final ApplicationStatusHistoryRepository history;
    private final RecruitmentStageRepository stages;
    private final NotificationRepository notifications;
    private final EmailOutboxRepository outbox;
    private final InviteMailSender mail;
    private final TenantPublicUrlService publicUrls;
    private final CvAccess access;
    private final NotificationPreferenceService preferences;

    public AssessmentInvitationService(JobTestRepository tests, ApplicationRepository applications,
            SubmissionRepository submissions, AiInterviewRepository aiInterviews,
            ApplicationStatusHistoryRepository history, RecruitmentStageRepository stages,
            NotificationRepository notifications, EmailOutboxRepository outbox, InviteMailSender mail,
            TenantPublicUrlService publicUrls, CvAccess access, NotificationPreferenceService preferences) {
        this.preferences = preferences;
        this.tests = tests;
        this.applications = applications;
        this.submissions = submissions;
        this.aiInterviews = aiInterviews;
        this.history = history;
        this.stages = stages;
        this.notifications = notifications;
        this.outbox = outbox;
        this.mail = mail;
        this.publicUrls = publicUrls;
        this.access = access;
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
        if (test.getAssignedApplication() != null && !test.getAssignedApplication().getId().equals(application.getId())) {
            throw conflict("Assessment is assigned to a different application", "APPLICATION_JOB_MISMATCH");
        }
        if (application.getArchivedAt() != null || application.getWithdrawnAt() != null
                || !SENDABLE.contains(application.getStatus())) {
            throw conflict("Application is not eligible for assessment", "APPLICATION_NOT_ELIGIBLE");
        }
        if (!aiInterviews.existsByApplication_IdAndStatus(application.getId(), AiInterviewStatus.PASSED)) {
            throw conflict("AI interview must be passed before sending assessment", "AI_INTERVIEW_NOT_PASSED");
        }
        var latest = submissions.findLatestIds(testId, application.getId(), PageRequest.of(0, 1));
        if (!latest.isEmpty() && submissions.findById(latest.getFirst())
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

        User candidate = application.getCandidate();
        String jobTitle = application.getJob().getTitle();
        String path = "/candidate/assessments?applicationId=" + application.getId();
        String title = "Lời mời làm bài Assessment";
        String body = "Nhà tuyển dụng mời bạn làm bài \"" + test.getTitle() + "\" cho vị trí " + jobTitle
                + ". Thời gian làm bài " + test.getDurationMinutes() + " phút, bắt đầu tính khi bạn bấm bắt đầu.";
        if (!preferences.webOff(candidate, NotificationCategory.ASSESSMENT)) {
            notifications.save(Notification.builder()
                    .user(candidate)
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
            String subject = "SmartHire: mời làm bài Assessment — " + jobTitle;
            String emailBody = """
                    Xin chào %s,

                    %s
                    Vui lòng đăng nhập để làm bài:

                    %s

                    SmartHire
                    """.formatted(
                    candidate.getFullName() == null ? candidate.getEmail() : candidate.getFullName(),
                    body,
                    publicUrls.path(path));
            emailSent = mail.send(candidate.getEmail(), subject, emailBody);
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

    private BusinessException notFound(String resource) {
        return new BusinessException(resource + " not found", HttpStatus.NOT_FOUND, "ASSESSMENT_NOT_FOUND");
    }

    private BusinessException conflict(String message, String code) {
        return new BusinessException(message, HttpStatus.CONFLICT, code);
    }
}
