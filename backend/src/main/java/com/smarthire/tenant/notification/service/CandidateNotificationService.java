package com.smarthire.tenant.notification.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.domain.enums.ApplicationStatus;
import com.smarthire.domain.enums.NotificationCategory;
import com.smarthire.domain.tenant.entity.Application;
import com.smarthire.domain.tenant.entity.Candidate;
import com.smarthire.domain.tenant.entity.EmailOutbox;
import com.smarthire.domain.tenant.entity.Job;
import com.smarthire.domain.tenant.entity.Notification;
import com.smarthire.domain.tenant.repository.EmailOutboxRepository;
import com.smarthire.domain.tenant.repository.NotificationRepository;
import com.smarthire.multitenancy.service.TenantPublicUrlService;
import java.util.LinkedHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/**
 * Sends recruiting stage updates to candidates on both channels: the candidate web inbox
 * ({@code notifications}) and their login Gmail account ({@code email_outbox}, delivered by worker).
 * Failures never break the business transaction that triggered the stage update.
 */
@Service
public class CandidateNotificationService {
    public static final String EMAIL_PURPOSE = "CANDIDATE_STAGE_NOTIFICATION";
    private static final Logger log = LoggerFactory.getLogger(CandidateNotificationService.class);

    private final NotificationRepository notifications;
    private final EmailOutboxRepository outbox;
    private final NotificationPreferenceService preferences;
    private final ObjectMapper json;
    private final ObjectProvider<TenantPublicUrlService> publicUrls;

    public CandidateNotificationService(
            NotificationRepository notifications,
            EmailOutboxRepository outbox,
            NotificationPreferenceService preferences,
            ObjectMapper json,
            ObjectProvider<TenantPublicUrlService> publicUrls) {
        this.notifications = notifications;
        this.outbox = outbox;
        this.preferences = preferences;
        this.json = json;
        this.publicUrls = publicUrls;
    }

    /**
     * Notifies the candidate when their CV is accepted/passed by the recruiter or auto-screening.
     */
    public void notifyCvPassed(Application application, String note) {
        if (application == null) return;
        Job job = application.getJob();
        String jobTitle = job != null ? job.getTitle() : "Tin tuyển dụng";
        String type = "CANDIDATE_CV_PASSED";
        String title = "Chúc mừng! Hồ sơ ứng tuyển của bạn đã được duyệt";
        String body = "Nhà tuyển dụng đã xem xét và chấp nhận hồ sơ của bạn cho vị trí " + jobTitle + "."
                + (StringUtils.hasText(note) ? " Ghi chú: " + note.trim() : "")
                + " Bạn đã được chuyển tiếp sang vòng tiếp theo trong quy trình tuyển dụng.";
        String path = "/applications/" + application.getId();
        notifyCandidate(application, NotificationCategory.APPLICATION, type, title, body, path);
    }

    /**
     * Notifies the candidate when their application is moved to a new stage/status.
     */
    public void notifyStageChanged(Application application, ApplicationStatus oldStatus, ApplicationStatus newStatus, String note) {
        if (application == null || newStatus == null || oldStatus == newStatus) return;

        Job job = application.getJob();
        String jobTitle = job != null ? job.getTitle() : "Tin tuyển dụng";
        String type;
        String title;
        String body;
        String path = "/applications/" + application.getId();

        switch (newStatus) {
            case ASSESSMENT -> {
                type = "CANDIDATE_STAGE_ASSESSMENT";
                title = "Mời tham gia vòng Đánh giá chuyên môn";
                body = "Hồ sơ của bạn cho vị trí " + jobTitle + " đã bước vào vòng Đánh giá năng lực chuyên môn (Assessment)."
                        + (StringUtils.hasText(note) ? " Ghi chú: " + note.trim() : "")
                        + " Vui lòng kiểm tra và hoàn thành bài kiểm tra theo thời hạn.";
                path = "/assessments";
            }
            case INTERVIEW -> {
                type = "CANDIDATE_STAGE_AI_INTERVIEW";
                title = "Mời tham gia vòng Phỏng vấn AI";
                body = "Hồ sơ ứng tuyển vị trí " + jobTitle + " của bạn đã tiến vào vòng Phỏng vấn AI."
                        + (StringUtils.hasText(note) ? " Ghi chú: " + note.trim() : "")
                        + " Hãy chuẩn bị không gian yên tĩnh và thiết bị phù hợp để bắt đầu buổi phỏng vấn.";
                path = "/interviews";
            }
            case HUMAN_INTERVIEW -> {
                type = "CANDIDATE_STAGE_HUMAN_INTERVIEW";
                title = "Mời tham gia vòng Phỏng vấn trực tiếp";
                body = "Chúc mừng bạn đã vượt qua các vòng đánh giá trước! Bạn được mời tham gia vòng Phỏng vấn trực tiếp với hội đồng tuyển dụng cho vị trí " + jobTitle + "."
                        + (StringUtils.hasText(note) ? " Ghi chú: " + note.trim() : "")
                        + " Thông tin lịch phỏng vấn chi tiết sẽ được gửi tới bạn sớm.";
                path = "/schedules";
            }
            case OFFER -> {
                type = "CANDIDATE_STAGE_OFFER";
                title = "Chúc mừng! Bạn đã nhận được lời mời nhận việc (Offer)";
                body = "Nhà tuyển dụng trân trọng gửi lời mời nhận việc (Offer) cho vị trí " + jobTitle + "."
                        + (StringUtils.hasText(note) ? " Ghi chú: " + note.trim() : "")
                        + " Vui lòng kiểm tra thông tin chi tiết và phản hồi lại bộ phận tuyển dụng.";
                path = "/applications/" + application.getId();
            }
            case HIRED -> {
                type = "CANDIDATE_STAGE_HIRED";
                title = "Chào mừng bạn chính thức gia nhập đội ngũ!";
                body = "Chúc mừng bạn đã hoàn thành xuất sắc toàn bộ quy trình tuyển dụng và chính thức trở thành thành viên cho vị trí " + jobTitle + "!"
                        + (StringUtils.hasText(note) ? " Lời nhắn: " + note.trim() : "");
                path = "/applications/" + application.getId();
            }
            case REJECTED -> {
                type = "APPLICATION_REJECTED";
                title = "Cập nhật kết quả ứng tuyển: " + jobTitle;
                body = "Cảm ơn bạn đã quan tâm và ứng tuyển vị trí " + jobTitle + "."
                        + (StringUtils.hasText(note) ? " " + note.trim() : " Rất tiếc hiện tại hồ sơ của bạn chưa phù hợp với yêu cầu của đợt tuyển dụng này. Chúc bạn luôn thành công trên con đường sự nghiệp!");
                path = "/applications/" + application.getId();
            }
            default -> {
                return;
            }
        }

        notifyCandidate(application, NotificationCategory.APPLICATION, type, title, body, path);
    }

    private void notifyCandidate(Application application, NotificationCategory category, String type, String title, String body, String path) {
        Candidate candidate = application.getCandidate();
        if (candidate == null || candidate.getId() == null) return;

        Job job = application.getJob();
        Long jobId = job != null ? job.getId() : null;
        String jobTitle = job != null ? job.getTitle() : null;
        Long applicationId = application.getId();

        String payload = payload(jobId, jobTitle, applicationId, path);
        String emailBody = emailBody(candidate.getFullName(), title, body, jobTitle, path);

        try {
            // 1. Web in-app notification
            if (!preferences.webOff(candidate, category)) {
                notifications.save(Notification.builder()
                        .candidate(candidate)
                        .type(type)
                        .title(title)
                        .body(body)
                        .payloadJson(payload)
                        .build());
            }

            // 2. Email outbox to candidate login gmail
            if (StringUtils.hasText(candidate.getEmail()) && !preferences.emailOff(candidate, category)) {
                String brand = brand();
                String subject = "[" + brand + "] " + title + (jobTitle != null ? " - " + jobTitle : "");
                outbox.save(EmailOutbox.builder()
                        .purpose(EMAIL_PURPOSE)
                        .toEmail(candidate.getEmail().trim())
                        .subject(subject.substring(0, Math.min(255, subject.length())))
                        .body(emailBody)
                        .build());
            }
        } catch (Exception ex) {
            log.warn("Candidate notification {} skipped for application {}: {}", type, applicationId, ex.toString());
        }
    }

    private String payload(Long jobId, String jobTitle, Long applicationId, String path) {
        var data = new LinkedHashMap<String, Object>();
        if (jobId != null) data.put("jobId", jobId);
        if (jobTitle != null) data.put("jobTitle", jobTitle);
        if (applicationId != null) data.put("applicationId", applicationId);
        if (path != null) data.put("path", path);
        try {
            return json.writeValueAsString(data);
        } catch (Exception ex) {
            return "{}";
        }
    }

    private String emailBody(String candidateName, String title, String body, String jobTitle, String path) {
        var text = new StringBuilder();
        text.append("Chào ").append(StringUtils.hasText(candidateName) ? candidateName : "bạn").append(",\n\n");
        text.append(body).append("\n\n");
        if (jobTitle != null) {
            text.append("Vị trí ứng tuyển / Position: ").append(jobTitle).append("\n");
        }
        String link = link(path);
        if (link != null) {
            text.append("Xem chi tiết hồ sơ / Open link: ").append(link).append("\n");
        }
        text.append("\nBạn có thể quản lý tùy chọn nhận thông báo trong mục Cài đặt thông báo tài khoản.\n\n");
        text.append("Trân trọng,\nĐội ngũ tuyển dụng ").append(brand());
        return text.toString();
    }

    private String link(String path) {
        if (path == null) return null;
        try {
            var service = publicUrls.getIfAvailable();
            return service == null ? null : service.path(path);
        } catch (Exception ex) {
            return null;
        }
    }

    private String brand() {
        try {
            return TenantPublicUrlService.brandOrDefault(publicUrls.getIfAvailable());
        } catch (Exception ex) {
            return "SmartHire";
        }
    }
}

