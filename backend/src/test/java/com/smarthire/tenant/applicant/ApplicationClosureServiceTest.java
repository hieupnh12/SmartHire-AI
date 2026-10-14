package com.smarthire.tenant.applicant;

import com.smarthire.common.storage.FileStorageService;
import com.smarthire.domain.enums.ApplicationStatus;
import com.smarthire.domain.enums.NotificationCategory;
import com.smarthire.domain.tenant.entity.Application;
import com.smarthire.domain.tenant.entity.Candidate;
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
import com.smarthire.tenant.applicant.service.ApplicationClosureService;
import com.smarthire.tenant.notification.service.NotificationPreferenceService;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ApplicationClosureServiceTest {
    @Mock ApplicationRepository applications;
    @Mock ApplicationStatusHistoryRepository history;
    @Mock CvRepository cvs;
    @Mock CvDocumentRepository documents;
    @Mock CvExtractionRepository extractions;
    @Mock NotificationRepository notifications;
    @Mock EmailOutboxRepository emails;
    @Mock NotificationPreferenceService preferences;
    @Mock FileStorageService storage;

    ApplicationClosureService service;
    Application application;
    Candidate candidate;

    @BeforeEach
    void setUp() {
        service = new ApplicationClosureService(applications, history, cvs, documents, extractions, notifications, emails,
                preferences, storage, 30, 180);
        candidate = new Candidate();
        candidate.setId(9L);
        candidate.setEmail("can@se36.local");
        Job job = new Job();
        job.setId(1L);
        job.setTitle("Backend Java");
        application = new Application();
        application.setId(4L);
        application.setJob(job);
        application.setCandidate(candidate);
        application.setStatus(ApplicationStatus.IN_REVIEW);
    }

    @Test
    void staleApplicationIsRejectedNotifiedAndCvRetentionSet() {
        Cv cv = new Cv();
        cv.setId(30L);
        when(applications.findTop200ByStatusInAndUpdatedAtBeforeOrderByIdAsc(any(), any())).thenReturn(List.of(application));
        when(cvs.findByApplication_IdOrderByIdDesc(4L)).thenReturn(List.of(cv));

        int closed = service.expireStale();

        assertThat(closed).isEqualTo(1);
        assertThat(application.getStatus()).isEqualTo(ApplicationStatus.REJECTED);
        assertThat(cv.getRetainUntil()).isAfter(Instant.now());
        var notification = ArgumentCaptor.forClass(Notification.class);
        verify(notifications).save(notification.capture());
        assertThat(notification.getValue().getType()).isEqualTo("APPLICATION_REJECTED");
        assertThat(notification.getValue().getBody()).contains("30 ngày");
        var email = ArgumentCaptor.forClass(EmailOutbox.class);
        verify(emails).save(email.capture());
        assertThat(email.getValue().getPurpose()).isEqualTo(ApplicationClosureService.EMAIL_PURPOSE);
    }

    @Test
    void rejectionRespectsCandidateOptOut() {
        application.setStatus(ApplicationStatus.REJECTED);
        when(preferences.webOff(candidate, NotificationCategory.APPLICATION)).thenReturn(true);
        when(preferences.emailOff(candidate, NotificationCategory.APPLICATION)).thenReturn(true);

        service.onClosed(application, "reason");

        verify(notifications, never()).save(any());
        verify(emails, never()).save(any());
    }

    @Test
    void purgeDeletesFileAndParsedContent() throws Exception {
        Cv cv = new Cv();
        cv.setId(30L);
        cv.setStorageKey("tenant/cv/30.pdf");
        cv.setRetainUntil(Instant.now().minusSeconds(60));
        when(cvs.findTop200ByRetainUntilBeforeAndStorageKeyIsNotNullOrderByIdAsc(any())).thenReturn(List.of(cv));

        int purged = service.purgeExpiredCvFiles();

        assertThat(purged).isEqualTo(1);
        assertThat(cv.getStorageKey()).isNull();
        verify(storage).delete("tenant/cv/30.pdf");
        verify(documents).deleteByCv_Id(30L);
        verify(extractions).deleteByCv_Id(30L);
    }

    @Test
    void purgeKeepsRecordWhenStorageFails() throws Exception {
        Cv cv = new Cv();
        cv.setId(31L);
        cv.setStorageKey("tenant/cv/31.pdf");
        doThrow(new java.io.IOException("down")).when(storage).delete("tenant/cv/31.pdf");

        assertThat(service.purge(cv)).isFalse();
        assertThat(cv.getStorageKey()).isEqualTo("tenant/cv/31.pdf");
        verify(documents, never()).deleteByCv_Id(any());
    }
}
