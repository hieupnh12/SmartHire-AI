package com.smarthire.tenant.job.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.enums.NotificationCategory;
import com.smarthire.domain.enums.UserStatus;
import com.smarthire.domain.tenant.entity.Candidate;
import com.smarthire.domain.tenant.entity.EmailOutbox;
import com.smarthire.domain.tenant.entity.Job;
import com.smarthire.domain.tenant.entity.JobAlert;
import com.smarthire.domain.tenant.entity.JobSkill;
import com.smarthire.domain.tenant.entity.Notification;
import com.smarthire.domain.tenant.repository.EmailOutboxRepository;
import com.smarthire.domain.tenant.repository.JobAlertRepository;
import com.smarthire.domain.tenant.repository.NotificationRepository;
import com.smarthire.multitenancy.service.TenantPublicUrlService;
import com.smarthire.tenant.cv.service.CvAccess;
import com.smarthire.tenant.job.dto.JobAlertModels.JobAlertView;
import com.smarthire.tenant.job.dto.JobAlertModels.SaveJobAlertRequest;
import com.smarthire.tenant.notification.service.NotificationPreferenceService;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class JobAlertService {

    public static final String EMAIL_PURPOSE = "CANDIDATE_JOB_ALERT";
    public static final String NOTIFICATION_TYPE = "CANDIDATE_JOB_ALERT";
    private static final int MAX_ALERTS_PER_CANDIDATE = 20;
    private static final Logger log = LoggerFactory.getLogger(JobAlertService.class);

    private final CvAccess access;
    private final JobAlertRepository alerts;
    private final NotificationRepository notifications;
    private final EmailOutboxRepository outbox;
    private final NotificationPreferenceService preferences;
    private final ObjectMapper json;
    private final ObjectProvider<TenantPublicUrlService> publicUrls;

    public JobAlertService(
            CvAccess access,
            JobAlertRepository alerts,
            NotificationRepository notifications,
            EmailOutboxRepository outbox,
            NotificationPreferenceService preferences,
            ObjectMapper json,
            ObjectProvider<TenantPublicUrlService> publicUrls) {
        this.access = access;
        this.alerts = alerts;
        this.notifications = notifications;
        this.outbox = outbox;
        this.preferences = preferences;
        this.json = json;
        this.publicUrls = publicUrls;
    }

    @Transactional(readOnly = true)
    public List<JobAlertView> list() {
        Candidate candidate = access.candidateActor();
        return alerts.findByCandidate_IdOrderByIdDesc(candidate.getId()).stream()
                .map(JobAlertService::toView)
                .toList();
    }

    @Transactional
    public JobAlertView create(SaveJobAlertRequest request) {
        Candidate candidate = access.candidateActor();
        if (alerts.countByCandidate_Id(candidate.getId()) >= MAX_ALERTS_PER_CANDIDATE) {
            throw new BusinessException(
                    "Bạn chỉ có thể tạo tối đa 20 đăng ký thông báo việc làm",
                    HttpStatus.CONFLICT,
                    "JOB_ALERT_LIMIT_REACHED");
        }
        JobAlert alert = new JobAlert();
        alert.setCandidate(candidate);
        applyRequest(alert, request);
        return toView(alerts.save(alert));
    }

    @Transactional
    public JobAlertView update(long id, SaveJobAlertRequest request) {
        Candidate candidate = access.candidateActor();
        JobAlert alert = alerts.findByIdAndCandidate_Id(id, candidate.getId())
                .orElseThrow(() -> new BusinessException("Không tìm thấy đăng ký thông báo việc làm",
                        HttpStatus.NOT_FOUND, "JOB_ALERT_NOT_FOUND"));
        applyRequest(alert, request);
        return toView(alerts.save(alert));
    }

    @Transactional
    public void delete(long id) {
        Candidate candidate = access.candidateActor();
        JobAlert alert = alerts.findByIdAndCandidate_Id(id, candidate.getId())
                .orElseThrow(() -> new BusinessException("Không tìm thấy đăng ký thông báo việc làm",
                        HttpStatus.NOT_FOUND, "JOB_ALERT_NOT_FOUND"));
        alerts.delete(alert);
    }

    /**
     * Dispatches web inbox and email notifications to active subscribers matching a newly published job.
     * Failures never break the publish transaction.
     */
    public void notifyMatchingSubscribers(Job job, List<JobSkill> skills) {
        if (job == null) {
            return;
        }
        try {
            List<JobAlert> activeAlerts = alerts.findActiveWithCandidateStatus(UserStatus.ACTIVE);
            if (activeAlerts.isEmpty()) {
                return;
            }
            String corpus = buildSearchCorpus(job, skills);
            Map<Long, CandidateAlertChannels> matchedByCandidate = new LinkedHashMap<>();
            for (JobAlert alert : activeAlerts) {
                if (!matches(alert, job, corpus)) {
                    continue;
                }
                Candidate candidate = alert.getCandidate();
                if (candidate == null || candidate.getId() == null) {
                    continue;
                }
                matchedByCandidate.merge(
                        candidate.getId(),
                        new CandidateAlertChannels(candidate, alert.isWebEnabled(), alert.isEmailEnabled()),
                        (existing, next) -> new CandidateAlertChannels(
                                existing.candidate(),
                                existing.web() || next.web(),
                                existing.email() || next.email()));
            }
            if (matchedByCandidate.isEmpty()) {
                return;
            }

            String path = "/jobs/" + job.getId();
            String payload = buildPayload(job, path);
            String title = "Việc làm mới phù hợp: " + job.getTitle();
            String body = buildBodyText(job);
            String emailBody = buildEmailBody(job, path);
            String brand = brand();

            for (CandidateAlertChannels target : matchedByCandidate.values()) {
                Candidate candidate = target.candidate();
                if (target.web() && !preferences.webOff(candidate, NotificationCategory.APPLICATION)) {
                    notifications.save(Notification.builder()
                            .candidate(candidate)
                            .type(NOTIFICATION_TYPE)
                            .title(title)
                            .body(body)
                            .payloadJson(payload)
                            .build());
                }
                if (target.email()
                        && StringUtils.hasText(candidate.getEmail())
                        && !preferences.emailOff(candidate, NotificationCategory.APPLICATION)) {
                    String subject = "[" + brand + "] " + title;
                    outbox.save(EmailOutbox.builder()
                            .purpose(EMAIL_PURPOSE)
                            .toEmail(candidate.getEmail().trim())
                            .subject(subject.substring(0, Math.min(255, subject.length())))
                            .body(emailBody)
                            .build());
                }
            }
        } catch (Exception ex) {
            log.warn("Job alert dispatch failed for job {}: {}", job.getId(), ex.toString());
        }
    }

    static boolean matches(JobAlert alert, Job job, String searchCorpus) {
        if (StringUtils.hasText(alert.getDepartment())) {
            String jobDept = job.getDepartment() == null ? "" : job.getDepartment().trim().toLowerCase(Locale.ROOT);
            if (!jobDept.contains(alert.getDepartment().trim().toLowerCase(Locale.ROOT))) {
                return false;
            }
        }
        if (StringUtils.hasText(alert.getLocation())) {
            String jobLoc = job.getLocation() == null ? "" : job.getLocation().trim().toLowerCase(Locale.ROOT);
            if (!jobLoc.contains(alert.getLocation().trim().toLowerCase(Locale.ROOT))) {
                return false;
            }
        }
        if (StringUtils.hasText(alert.getWorkMode())) {
            String jobMode = job.getWorkMode() == null ? "" : job.getWorkMode().trim();
            if (!jobMode.equalsIgnoreCase(alert.getWorkMode().trim())) {
                return false;
            }
        }
        if (StringUtils.hasText(alert.getEmploymentType())) {
            String jobType = job.getEmploymentType() == null ? "" : job.getEmploymentType().trim();
            if (!jobType.equalsIgnoreCase(alert.getEmploymentType().trim())) {
                return false;
            }
        }
        if (StringUtils.hasText(alert.getKeyword())) {
            String kw = alert.getKeyword().trim().toLowerCase(Locale.ROOT);
            if (!searchCorpus.contains(kw)) {
                return false;
            }
        }
        return true;
    }

    private static String buildSearchCorpus(Job job, List<JobSkill> skills) {
        String skillText = skills == null
                ? ""
                : skills.stream()
                        .map(s -> s.getSkill() == null ? "" : s.getSkill().getName())
                        .filter(StringUtils::hasText)
                        .collect(Collectors.joining(" "));
        return (nonNull(job.getTitle()) + " "
                + nonNull(job.getDepartment()) + " "
                + nonNull(job.getLocation()) + " "
                + nonNull(job.getDescription()) + " "
                + skillText).toLowerCase(Locale.ROOT);
    }

    private void applyRequest(JobAlert alert, SaveJobAlertRequest request) {
        boolean web = request.webEnabled() != null ? request.webEnabled() : alert.isWebEnabled();
        boolean email = request.emailEnabled() != null ? request.emailEnabled() : alert.isEmailEnabled();
        boolean active = request.active() != null ? request.active() : alert.isActive();
        if (active && !web && !email) {
            throw new BusinessException(
                    "Vui lòng bật ít nhất một kênh nhận thông báo (web hoặc email)",
                    HttpStatus.BAD_REQUEST,
                    "JOB_ALERT_CHANNEL_REQUIRED");
        }
        alert.setKeyword(blankToNull(request.keyword()));
        alert.setDepartment(blankToNull(request.department()));
        alert.setLocation(blankToNull(request.location()));
        alert.setWorkMode(blankToNull(request.workMode()));
        alert.setEmploymentType(blankToNull(request.employmentType()));
        alert.setWebEnabled(web);
        alert.setEmailEnabled(email);
        alert.setActive(active);
    }

    private String buildPayload(Job job, String path) {
        var data = new LinkedHashMap<String, Object>();
        data.put("jobId", job.getId());
        data.put("jobTitle", job.getTitle());
        if (StringUtils.hasText(job.getDepartment())) data.put("department", job.getDepartment());
        if (StringUtils.hasText(job.getLocation())) data.put("location", job.getLocation());
        data.put("path", path);
        try {
            return json.writeValueAsString(data);
        } catch (Exception ex) {
            return "{}";
        }
    }

    private String buildBodyText(Job job) {
        StringBuilder sb = new StringBuilder();
        sb.append(brand()).append(" vừa đăng tuyển vị trí mới: ").append(job.getTitle());
        if (StringUtils.hasText(job.getLocation())) {
            sb.append(" • ").append(job.getLocation());
        }
        if (StringUtils.hasText(job.getDepartment())) {
            sb.append(" • ").append(job.getDepartment());
        }
        sb.append(".");
        return sb.toString();
    }

    private String buildEmailBody(Job job, String path) {
        var sb = new StringBuilder();
        sb.append("Xin chào,\n\n");
        sb.append(brand()).append(" vừa mở vị trí mới phù hợp với đăng ký thông báo của bạn:\n");
        sb.append("- Vị trí / Position: ").append(job.getTitle()).append("\n");
        if (StringUtils.hasText(job.getDepartment())) {
            sb.append("- Phòng ban / Department: ").append(job.getDepartment()).append("\n");
        }
        if (StringUtils.hasText(job.getLocation())) {
            sb.append("- Địa điểm / Location: ").append(job.getLocation()).append("\n");
        }
        String link = link(path);
        if (link != null) {
            sb.append("\nXem chi tiết & ứng tuyển / Open job: ").append(link).append("\n");
        }
        sb.append("\nBạn có thể quản lý hoặc tắt đăng ký thông báo việc làm trên trang Việc làm của ").append(brand()).append(".");
        return sb.toString();
    }

    private String link(String path) {
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

    private static JobAlertView toView(JobAlert alert) {
        return new JobAlertView(
                alert.getId(),
                alert.getKeyword(),
                alert.getDepartment(),
                alert.getLocation(),
                alert.getWorkMode(),
                alert.getEmploymentType(),
                alert.isWebEnabled(),
                alert.isEmailEnabled(),
                alert.isActive(),
                alert.getCreatedAt(),
                alert.getUpdatedAt());
    }

    private static String blankToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private static String nonNull(String value) {
        return value == null ? "" : value;
    }

    private record CandidateAlertChannels(Candidate candidate, boolean web, boolean email) {
    }
}

