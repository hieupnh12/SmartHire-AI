package com.smarthire.tenant.applicant.service;

import com.smarthire.common.storage.FileStorageService;
import com.smarthire.domain.enums.ApplicationStatus;
import com.smarthire.domain.enums.NotificationCategory;
import com.smarthire.domain.tenant.entity.Application;
import com.smarthire.domain.tenant.entity.ApplicationStatusHistory;
import com.smarthire.domain.tenant.entity.Cv;
import com.smarthire.domain.tenant.entity.EmailOutbox;
import com.smarthire.domain.tenant.entity.Job;
import com.smarthire.domain.tenant.entity.Notification;
import com.smarthire.domain.tenant.repository.ApplicationRepository;
import com.smarthire.domain.tenant.repository.ApplicationStatusHistoryRepository;
import com.smarthire.domain.tenant.repository.CvDocumentRepository;
import com.smarthire.domain.tenant.repository.CvExtractionRepository;
import com.smarthire.domain.tenant.repository.CvRepository;
import com.smarthire.domain.tenant.repository.EmailOutboxRepository;
import com.smarthire.domain.tenant.repository.NotificationRepository;
import com.smarthire.tenant.notification.service.NotificationPreferenceService;
import java.time.Duration;
import java.time.Instant;
import java.util.EnumSet;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Side effects of an application reaching a closed status: notification, CV retention, stale/job cleanup. */
@Service
public class ApplicationClosureService {
    public static final String EMAIL_PURPOSE = "APPLICATION_RESULT";
    /** Statuses that end an application; the candidate may then apply elsewhere. */
    public static final Set<ApplicationStatus> CLOSED =
            EnumSet.of(ApplicationStatus.REJECTED, ApplicationStatus.FAILED, ApplicationStatus.WITHDRAWN);
    /** Statuses waiting on the recruiter; AI interview and offer have their own deadlines. */
    private static final Set<ApplicationStatus> STALE_CANDIDATES = EnumSet.of(
            ApplicationStatus.NEW, ApplicationStatus.IN_REVIEW, ApplicationStatus.ASSESSMENT, ApplicationStatus.HUMAN_INTERVIEW);
    private static final Logger log = LoggerFactory.getLogger(ApplicationClosureService.class);

    private final ApplicationRepository applications;
    private final ApplicationStatusHistoryRepository history;
    private final CvRepository cvs;
    private final CvDocumentRepository documents;
    private final CvExtractionRepository extractions;
    private final NotificationRepository notifications;
    private final EmailOutboxRepository emails;
    private final NotificationPreferenceService preferences;
    private final FileStorageService storage;
    private final int staleDays;
    private final int cvRetentionDays;

    public ApplicationClosureService(
            ApplicationRepository applications,
            ApplicationStatusHistoryRepository history,
            CvRepository cvs,
            CvDocumentRepository documents,
            CvExtractionRepository extractions,
            NotificationRepository notifications,
            EmailOutboxRepository emails,
            NotificationPreferenceService preferences,
            FileStorageService storage,
            @Value("${app.applications.stale-days:30}") int staleDays,
            @Value("${app.applications.cv-retention-days:180}") int cvRetentionDays) {
        this.applications = applications;
        this.history = history;
        this.cvs = cvs;
        this.documents = documents;
        this.extractions = extractions;
        this.notifications = notifications;
        this.emails = emails;
        this.preferences = preferences;
        this.storage = storage;
        this.staleDays = staleDays;
        this.cvRetentionDays = cvRetentionDays;
    }

    public static boolean closed(ApplicationStatus status) {
        return status != null && CLOSED.contains(status);
    }

    /**
     * Must be called after an application moved into a closed status.
     * {@code candidateReason} is shown to the candidate, so never pass recruiter-internal notes.
     */
    public void onClosed(Application application, String candidateReason) {
        Instant until = Instant.now().plus(Duration.ofDays(cvRetentionDays));
        for (Cv cv : cvs.findByApplication_IdOrderByIdDesc(application.getId())) {
            if (cv.getRetainUntil() == null || cv.getRetainUntil().isAfter(until)) cv.setRetainUntil(until);
        }
        if (application.getStatus() == ApplicationStatus.REJECTED) notifyRejected(application, candidateReason);
    }

    /** Re-applying after a withdrawal keeps the application's CVs alive again. */
    public void onReopened(Application application) {
        for (Cv cv : cvs.findByApplication_IdOrderByIdDesc(application.getId())) {
            if (cv.getStorageKey() != null) cv.setRetainUntil(null);
        }
    }

    @Transactional
    public int expireStale() {
        Instant cutoff = Instant.now().minus(Duration.ofDays(staleDays));
        var rows = applications.findTop200ByStatusInAndUpdatedAtBeforeOrderByIdAsc(STALE_CANDIDATES, cutoff);
        for (Application application : rows) {
            close(application, "Auto-closed: no progress for " + staleDays + " days",
                    "Hồ sơ đã quá " + staleDays + " ngày chưa được xử lý nên được đóng tự động.");
        }
        return rows.size();
    }

    /** A removed job can no longer progress anyone, so its open applications are closed. */
    @Transactional
    public void closeForRemovedJob(Job job) {
        var open = EnumSet.copyOf(CLOSED);
        open.add(ApplicationStatus.HIRED);
        for (Application application : applications.findByJob_IdAndStatusNotIn(job.getId(), open)) {
            close(application, "Auto-closed: job removed", "Tin tuyển dụng đã được gỡ nên hồ sơ được đóng.");
        }
    }

    @Transactional
    public int purgeExpiredCvFiles() {
        var rows = cvs.findTop200ByRetainUntilBeforeAndStorageKeyIsNotNullOrderByIdAsc(Instant.now());
        int purged = 0;
        for (Cv cv : rows) {
            if (purge(cv)) purged++;
        }
        return purged;
    }

    /** Deletes the stored file and parsed personal data; scores stay for recruiter statistics. */
    public boolean purge(Cv cv) {
        if (cv.getStorageKey() != null) {
            try {
                storage.delete(cv.getStorageKey());
            } catch (Exception ex) {
                log.warn("Could not purge CV file for cv {}", cv.getId());
                return false;
            }
        }
        documents.deleteByCv_Id(cv.getId());
        extractions.deleteByCv_Id(cv.getId());
        cv.setStorageKey(null);
        cv.setBuilderData(null);
        cv.setShareToken(null);
        if (cv.getRetainUntil() == null || cv.getRetainUntil().isAfter(Instant.now())) cv.setRetainUntil(Instant.now());
        return true;
    }

    private void close(Application application, String note, String candidateReason) {
        ApplicationStatusHistory row = new ApplicationStatusHistory();
        row.setApplication(application);
        row.setFromStatus(application.getStatus().name());
        row.setToStatus(ApplicationStatus.REJECTED.name());
        row.setNote(note);
        history.save(row);
        application.setStatus(ApplicationStatus.REJECTED);
        application.setRejectReason(note);
        onClosed(application, candidateReason);
    }

    private void notifyRejected(Application application, String reason) {
        var candidate = application.getCandidate();
        String title = "Kết quả ứng tuyển: " + application.getJob().getTitle();
        String body = "Hồ sơ ứng tuyển vị trí " + application.getJob().getTitle() + " không được tiếp tục."
                + (reason == null || reason.isBlank() ? "" : " " + reason.trim());
        if (!preferences.webOff(candidate, NotificationCategory.APPLICATION)) {
            notifications.save(Notification.builder().candidate(candidate).type("APPLICATION_REJECTED").title(title).body(body)
                    .payloadJson("{\"path\":\"/applications/" + application.getId() + "\",\"applicationId\":" + application.getId() + "}")
                    .build());
        }
        if (!preferences.emailOff(candidate, NotificationCategory.APPLICATION)) {
            emails.save(EmailOutbox.builder().purpose(EMAIL_PURPOSE).toEmail(candidate.getEmail()).subject(title).body(body).build());
        }
    }
}
