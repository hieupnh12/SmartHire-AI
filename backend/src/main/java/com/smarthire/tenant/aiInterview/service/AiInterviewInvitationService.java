package com.smarthire.tenant.aiInterview.service;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.enums.AiInterviewStatus;
import com.smarthire.domain.enums.ApplicationStatus;
import com.smarthire.domain.tenant.entity.AiInterview;
import com.smarthire.domain.tenant.entity.Notification;
import com.smarthire.domain.tenant.entity.RecruitmentStage;
import com.smarthire.domain.tenant.repository.AiInterviewRepository;
import com.smarthire.domain.tenant.repository.ApplicationRepository;
import com.smarthire.domain.tenant.repository.NotificationRepository;
import com.smarthire.multitenancy.context.TenantContext;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AiInterviewInvitationService {
    private final ApplicationRepository applications;
    private final AiInterviewRepository interviews;
    private final NotificationRepository notifications;

    public AiInterviewInvitationService(ApplicationRepository applications, AiInterviewRepository interviews,
                                        NotificationRepository notifications) {
        this.applications = applications;
        this.interviews = interviews;
        this.notifications = notifications;
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
        if (!existing.isEmpty()) return existing.get(0);
        AiInterview interview = interviews.save(AiInterview.builder()
                .application(application).workflowStage(stage).status(AiInterviewStatus.GENERATING).build());
        notifications.save(Notification.builder()
                .user(application.getCandidate())
                .type("AI_INTERVIEW_INVITATION")
                .title("Lời mời phỏng vấn AI")
                .body("Bộ phận tuyển dụng mời bạn tham gia vòng AI Interview cho vị trí "
                        + application.getJob().getTitle() + ". CV của bạn đã qua vòng sàng lọc."
                        + " Bạn sẽ có thể bắt đầu khi nhà tuyển dụng chuẩn bị xong câu hỏi.")
                .payloadJson("{\"aiInterviewId\":" + interview.getId() + ",\"applicationId\":" + applicationId
                        + ",\"path\":\"/candidate/interviews/" + interview.getId() + "\"}")
                .build());
        return interview;
    }
}
