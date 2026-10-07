package com.smarthire.tenant.aiInterview.service;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.enums.AiInterviewStatus;
import com.smarthire.domain.enums.ApplicationStatus;
import com.smarthire.domain.enums.NotificationCategory;
import com.smarthire.domain.tenant.entity.AiInterview;
import com.smarthire.domain.tenant.entity.Notification;
import com.smarthire.domain.tenant.entity.RecruitmentStage;
import com.smarthire.domain.tenant.repository.AiInterviewRepository;
import com.smarthire.domain.tenant.repository.ApplicationRepository;
import com.smarthire.domain.tenant.repository.NotificationRepository;
import com.smarthire.multitenancy.context.TenantContext;
import com.smarthire.tenant.applicant.service.AiInterviewInviteService;
import com.smarthire.tenant.notification.service.NotificationPreferenceService;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AiInterviewInvitationService {
    private static final DateTimeFormatter INVITATION_TIME = DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy")
            .withZone(ZoneId.of("Asia/Bangkok"));
    private final ApplicationRepository applications;
    private final AiInterviewRepository interviews;
    private final NotificationRepository notifications;
    private final AiInterviewActivityLog activity;
    private final AiInterviewInviteService emailInvites;
    private final NotificationPreferenceService preferences;

    public AiInterviewInvitationService(ApplicationRepository applications, AiInterviewRepository interviews,
                                        NotificationRepository notifications, AiInterviewActivityLog activity,
                                        AiInterviewInviteService emailInvites, NotificationPreferenceService preferences) {
        this.applications = applications;
        this.interviews = interviews;
        this.notifications = notifications;
        this.activity = activity;
        this.emailInvites = emailInvites;
        this.preferences = preferences;
    }

    @Transactional
    public AiInterview invite(long applicationId, RecruitmentStage stage) {
        String tenant = TenantContext.getCurrentTenant();
        if (tenant == null || tenant.isBlank() || "smarthire_master".equals(tenant)) {
            throw new BusinessException("Tenant access required", HttpStatus.FORBIDDEN, "AI_INTERVIEW_FORBIDDEN");
        }
        // Serialize automatic and recruiter invitations for the same application.
        var application = applications.findByIdForUpdate(applicationId)
                .orElseThrow(() -> new BusinessException("Application not found", HttpStatus.NOT_FOUND, "APPLICATION_NOT_FOUND"));
        if (application.getStatus() != ApplicationStatus.INTERVIEW || application.getArchivedAt() != null
                || application.getWithdrawnAt() != null) {
            throw new BusinessException("Application must be in the interview round", HttpStatus.CONFLICT, "AI_INTERVIEW_NOT_ELIGIBLE");
        }
        var existing = interviews.findByApplication_IdOrderByIdDesc(applicationId);
        AiInterviewEligibility.require(application);
        if (!existing.isEmpty()) {
            var latest = existing.get(0);
            if (latest.getCompletedAt() != null || latest.getConfigSnapshotJson() != null && InterviewPolicies.communicationOnly(InterviewPolicies.config(latest).policy())) return latest;
        }
        return createAttempt(application, stage, 1);
    }

    @Transactional
    public AiInterview openNextAttempt(long applicationId) {
        requireTenant();
        var application = applications.findByIdForUpdate(applicationId)
                .orElseThrow(() -> new BusinessException("Application not found", HttpStatus.NOT_FOUND, "APPLICATION_NOT_FOUND"));
        if (application.getStatus() != ApplicationStatus.INTERVIEW || application.getArchivedAt() != null
                || application.getWithdrawnAt() != null) {
            throw new BusinessException("Application must be in the interview round", HttpStatus.CONFLICT, "AI_INTERVIEW_NOT_ELIGIBLE");
        }
        AiInterviewEligibility.require(application);
        var existing = interviews.findByApplication_IdOrderByIdDesc(applicationId);
        if (existing.isEmpty()) return createAttempt(application, null, 1);
        var latest = existing.get(0);
        if (latest.getStatus() != AiInterviewStatus.FAILED || !InterviewPolicies.canRetry(latest, java.time.Instant.now())) {
            if (latest.getStatus() != AiInterviewStatus.PASSED && latest.getStatus() != AiInterviewStatus.FAILED
                    && latest.getStatus() != AiInterviewStatus.SCORED) return latest;
            throw new BusinessException("AI interview attempt already completed", HttpStatus.CONFLICT, "AI_INTERVIEW_ALREADY_COMPLETED");
        }
        return createAttempt(application, latest.getWorkflowStage(), latest.getAttemptNumber() + 1);
    }

    private AiInterview createAttempt(com.smarthire.domain.tenant.entity.Application application, RecruitmentStage stage, int attemptNumber) {
        AiInterview interview = AiInterview.builder()
                .application(application).workflowStage(stage).status(AiInterviewStatus.GENERATING)
                .attemptNumber(attemptNumber).build();
        InterviewPolicies.snapshot(interview);
        interview = interviews.save(interview);
        var config = InterviewPolicies.config(interview);
        activity.record(interview, "INVITED", "Attempt " + attemptNumber + " created for application " + application.getId()
                + "; generation of " + config.questionCount() + " Communication questions queued");
        if (!preferences.webOff(application.getCandidate(), NotificationCategory.AI_INTERVIEW)) {
            notifications.save(Notification.builder()
                    .user(application.getCandidate())
                    .type("AI_INTERVIEW_INVITATION")
                    .title(attemptNumber == 1 ? "Lời mời phỏng vấn AI" : "Lượt làm lại AI Interview")
                    .body(invitationBody(application.getJob().getTitle(), config.availableFrom(), config.availableUntil(),
                            config.policy().durationMinutes(), config.policy().maxAttempts()))
                    .payloadJson("{\"aiInterviewId\":" + interview.getId() + ",\"applicationId\":" + application.getId()
                            + ",\"path\":\"/candidate/interviews/" + interview.getId() + "\"}")
                    .build());
            activity.record(interview, "NOTIFICATION_SENT", "AI_INTERVIEW_INVITATION");
        }
        emailInvites.sendForInterview(application);
        return interview;
    }

    private static String invitationBody(String jobTitle, Instant availableFrom, Instant availableUntil,
            int durationMinutes, int maxAttempts) {
        return "Chúc mừng, bạn đã vượt qua vòng CV Screening cho vị trí " + jobTitle + ".\n"
                + "Vòng tiếp theo là AI Interview.\n"
                + "Thời gian có thể bắt đầu: " + formatTime(availableFrom, "Ngay khi câu hỏi sẵn sàng") + "\n"
                + "Hạn hoàn thành: " + formatTime(availableUntil, "Không giới hạn") + "\n"
                + "Thời lượng: " + durationMinutes + " phút\n"
                + "Số lần thực hiện: " + maxAttempts + "\n"
                + "Bạn có thể bắt đầu AI Interview bất kỳ lúc nào trong khoảng thời gian trên.";
    }

    private static String formatTime(Instant value, String fallback) {
        return value == null ? fallback : INVITATION_TIME.format(value);
    }

    private void requireTenant() {
        String tenant = com.smarthire.multitenancy.context.TenantContext.getCurrentTenant();
        if (tenant == null || tenant.isBlank() || "smarthire_master".equals(tenant)) {
            throw new BusinessException("Tenant access required", HttpStatus.FORBIDDEN, "AI_INTERVIEW_FORBIDDEN");
        }
    }
}
