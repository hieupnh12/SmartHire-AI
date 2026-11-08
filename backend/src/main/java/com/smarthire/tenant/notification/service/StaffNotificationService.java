package com.smarthire.tenant.notification.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.domain.enums.NotificationCategory;
import com.smarthire.domain.enums.UserRole;
import com.smarthire.domain.enums.UserStatus;
import com.smarthire.domain.tenant.entity.Application;
import com.smarthire.domain.tenant.entity.EmailOutbox;
import com.smarthire.domain.tenant.entity.Job;
import com.smarthire.domain.tenant.entity.Notification;
import com.smarthire.domain.tenant.entity.User;
import com.smarthire.domain.tenant.repository.EmailOutboxRepository;
import com.smarthire.domain.tenant.repository.JobAssignmentRepository;
import com.smarthire.domain.tenant.repository.NotificationRepository;
import com.smarthire.multitenancy.service.TenantPublicUrlService;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/**
 * Sends recruiting events to staff members of a job on both channels: the web inbox
 * ({@code notifications}) and Gmail ({@code email_outbox}, delivered by the AI work worker).
 * Failures never break the business transaction that triggered the event.
 */
@Service
public class StaffNotificationService {
    public static final String EMAIL_PURPOSE = "STAFF_NOTIFICATION";
    private static final Logger log = LoggerFactory.getLogger(StaffNotificationService.class);

    private final JobAssignmentRepository assignments;
    private final NotificationRepository notifications;
    private final EmailOutboxRepository outbox;
    private final NotificationPreferenceService preferences;
    private final ObjectMapper json;
    private final ObjectProvider<TenantPublicUrlService> publicUrls;

    public StaffNotificationService(
            JobAssignmentRepository assignments,
            NotificationRepository notifications,
            EmailOutboxRepository outbox,
            NotificationPreferenceService preferences,
            ObjectMapper json,
            ObjectProvider<TenantPublicUrlService> publicUrls) {
        this.assignments = assignments;
        this.notifications = notifications;
        this.outbox = outbox;
        this.preferences = preferences;
        this.json = json;
        this.publicUrls = publicUrls;
    }

    /** Job owner, staff assigned with view access, and the application assignee (deduplicated, active staff only). */
    public List<User> jobRecipients(Job job, Application application) {
        var recipients = new LinkedHashMap<Long, User>();
        if (job != null) {
            add(recipients, job.getCreatedBy());
            if (job.getId() != null) {
                for (var row : assignments.findByJob_IdOrderByIdAsc(job.getId())) {
                    if (row.isCanView()) add(recipients, row.getUser());
                }
            }
        }
        if (application != null) add(recipients, application.getAssignee());
        return List.copyOf(recipients.values());
    }

    public void notifyJobStaff(Job job, Application application, NotificationCategory category,
            String type, String title, String body, String path) {
        try {
            notifyUsers(jobRecipients(job, application), category, type, title, body, job, application, path);
        } catch (Exception ex) {
            log.warn("Staff notification {} skipped for job {}: {}", type, job == null ? null : job.getId(), ex.toString());
        }
    }

    public void notifyUsers(Collection<User> users, NotificationCategory category, String type, String title,
            String body, Job job, Application application, String path) {
        notifyUsers(users, category, type, title, body,
                job == null ? null : job.getId(), job == null ? null : job.getTitle(),
                application == null ? null : application.getId(), path);
    }

    public void notifyUsers(Collection<User> users, NotificationCategory category, String type, String title,
            String body, Long jobId, String jobTitle, Long applicationId, String path) {
        if (users == null || users.isEmpty()) return;
        String payload = payload(jobId, jobTitle, applicationId, path);
        String emailBody = emailBody(title, body, jobTitle, path);
        for (User user : users) {
            if (user == null || user.getId() == null) continue;
            try {
                if (!preferences.webOff(user, category)) {
                    notifications.save(Notification.builder().user(user).type(type).title(title).body(body)
                            .payloadJson(payload).build());
                }
                if (StringUtils.hasText(user.getEmail()) && !preferences.emailOff(user, category)) {
                    String subject = jobTitle == null ? title : title + " - " + jobTitle;
                    outbox.save(EmailOutbox.builder().purpose(EMAIL_PURPOSE).toEmail(user.getEmail())
                            .subject(subject.substring(0, Math.min(255, subject.length()))).body(emailBody).build());
                }
            } catch (Exception ex) {
                log.warn("Staff notification {} skipped for user {}: {}", type, user.getId(), ex.toString());
            }
        }
    }

    private static void add(Map<Long, User> recipients, User user) {
        if (user == null || user.getId() == null) return;
        if (user.getStatus() != UserStatus.ACTIVE || UserRole.isCandidate(user.getRole())) return;
        recipients.putIfAbsent(user.getId(), user);
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

    private String emailBody(String title, String body, String jobTitle, String path) {
        var text = new StringBuilder(title).append("\n\n");
        if (StringUtils.hasText(body)) text.append(body).append("\n\n");
        if (jobTitle != null) text.append("Vị trí / Position: ").append(jobTitle).append("\n");
        String link = link(path);
        if (link != null) text.append("Xem chi tiết / Open: ").append(link).append("\n");
        text.append("\nBạn có thể tắt email này trong mục Thông báo > Cài đặt.\n").append(brand());
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
