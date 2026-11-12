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
import com.smarthire.domain.tenant.entity.Skill;
import com.smarthire.domain.tenant.repository.EmailOutboxRepository;
import com.smarthire.domain.tenant.repository.JobAlertRepository;
import com.smarthire.domain.tenant.repository.NotificationRepository;
import com.smarthire.multitenancy.service.TenantPublicUrlService;
import com.smarthire.tenant.cv.service.CvAccess;
import com.smarthire.tenant.job.dto.JobAlertModels.SaveJobAlertRequest;
import com.smarthire.tenant.notification.service.NotificationPreferenceService;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class JobAlertServiceTest {

    private final CvAccess access = mock(CvAccess.class);
    private final JobAlertRepository alerts = mock(JobAlertRepository.class);
    private final NotificationRepository notifications = mock(NotificationRepository.class);
    private final EmailOutboxRepository outbox = mock(EmailOutboxRepository.class);
    private final NotificationPreferenceService preferences = mock(NotificationPreferenceService.class);
    @SuppressWarnings("unchecked")
    private final ObjectProvider<TenantPublicUrlService> publicUrls = mock(ObjectProvider.class);

    private final JobAlertService service = new JobAlertService(
            access, alerts, notifications, outbox, preferences, new ObjectMapper(), publicUrls);

    @Test
    void createRequiresAtLeastOneNotificationChannelWhenActive() {
        Candidate candidate = new Candidate();
        candidate.setId(5L);
        when(access.candidateActor()).thenReturn(candidate);
        when(alerts.countByCandidate_Id(5L)).thenReturn(0L);

        assertThatThrownBy(() -> service.create(new SaveJobAlertRequest("Java", null, null, null, null, false, false, true)))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getCode())
                .isEqualTo("JOB_ALERT_CHANNEL_REQUIRED");
    }

    @Test
    void notifyMatchingSubscribersDispatchesWebAndEmailOnlyToMatchingRules() {
        Candidate cand1 = new Candidate();
        cand1.setId(1L);
        cand1.setEmail("cand1@acme.com");
        cand1.setStatus(UserStatus.ACTIVE);

        Candidate cand2 = new Candidate();
        cand2.setId(2L);
        cand2.setEmail("cand2@acme.com");
        cand2.setStatus(UserStatus.ACTIVE);

        JobAlert matchRule = JobAlert.builder()
                .candidate(cand1)
                .keyword("Java")
                .location("Ha Noi")
                .webEnabled(true)
                .emailEnabled(true)
                .active(true)
                .build();
        JobAlert nonMatchRule = JobAlert.builder()
                .candidate(cand2)
                .department("Marketing")
                .webEnabled(true)
                .emailEnabled(true)
                .active(true)
                .build();

        when(alerts.findActiveWithCandidateStatus(UserStatus.ACTIVE)).thenReturn(List.of(matchRule, nonMatchRule));
        when(preferences.webOff(any(Candidate.class), eq(NotificationCategory.APPLICATION))).thenReturn(false);
        when(preferences.emailOff(any(Candidate.class), eq(NotificationCategory.APPLICATION))).thenReturn(false);

        Job job = new Job();
        job.setId(30L);
        job.setTitle("Senior Backend Engineer");
        job.setDepartment("Engineering");
        job.setLocation("Ha Noi");
        job.setDescription("Build scalable services.");

        service.notifyMatchingSubscribers(job, List.of(
                JobSkill.builder().job(job).skill(Skill.builder().name("Java").build()).build()));

        verify(notifications, times(1)).save(any(Notification.class));
        verify(outbox, times(1)).save(any(EmailOutbox.class));
    }
}

