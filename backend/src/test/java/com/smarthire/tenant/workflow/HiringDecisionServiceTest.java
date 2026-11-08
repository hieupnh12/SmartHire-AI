package com.smarthire.tenant.workflow;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.enums.ApplicationStatus;
import com.smarthire.domain.enums.HiringDecisionType;
import com.smarthire.domain.tenant.entity.*;
import com.smarthire.domain.tenant.repository.*;
import com.smarthire.tenant.applicant.service.ApplicantService;
import com.smarthire.tenant.cv.service.CvAccess;
import com.smarthire.tenant.notification.service.NotificationPreferenceService;
import com.smarthire.tenant.workflow.dto.HiringDecisionModels.DecisionRequest;
import com.smarthire.tenant.workflow.service.HiringDecisionService;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class HiringDecisionServiceTest {
    @Mock ApplicationRepository applications;
    @Mock HiringDecisionRepository decisions;
    @Mock UserRepository users;
    @Mock ApplicantService applicants;
    @Mock CvAccess access;
    @Mock NotificationRepository notifications;
    @Mock EmailOutboxRepository emails;
    @Mock NotificationPreferenceService preferences;

    HiringDecisionService service;
    Application application;
    User owner;

    @BeforeEach
    void setUp() {
        service = new HiringDecisionService(applications, decisions, users, applicants, access, notifications, emails, preferences);
        owner = new User();
        owner.setId(2L);
        owner.setFullName("Owner");
        owner.setEmail("owner@se36.local");
        Job job = new Job();
        job.setId(1L);
        job.setTitle("Backend Java");
        job.setCreatedBy(owner);
        Candidate candidate = new Candidate();
        candidate.setId(9L);
        candidate.setFullName("Candidate");
        candidate.setEmail("can@se36.local");
        application = new Application();
        application.setId(4L);
        application.setJob(job);
        application.setCandidate(candidate);
        lenient().when(access.staff()).thenReturn(true);
        lenient().when(access.actor()).thenReturn(owner);
        lenient().when(applications.findByIdForUpdate(4L)).thenReturn(Optional.of(application));
        lenient().when(decisions.save(any())).thenAnswer(inv -> {
            HiringDecision saved = inv.getArgument(0);
            saved.setId(11L);
            return saved;
        });
    }

    @Test
    void hireMovesHumanInterviewToOfferAndNotifiesCandidate() {
        application.setStatus(ApplicationStatus.HUMAN_INTERVIEW);

        var view = service.decide(4L, new DecisionRequest(HiringDecisionType.HIRE, null));

        assertThat(view.decision()).isEqualTo(HiringDecisionType.HIRE);
        assertThat(view.decidedByName()).isEqualTo("Owner");
        verify(applicants).changeStatus(eq(4L), eq("OFFER"), anyString());
        verify(notifications).save(argThat(n -> "APPLICATION_OFFER".equals(n.getType())));
        verify(emails).save(any());
    }

    @Test
    void hireOnExistingOfferOnlyRecordsDecision() {
        application.setStatus(ApplicationStatus.OFFER);

        service.decide(4L, new DecisionRequest(HiringDecisionType.HIRE, "Approved by HR"));

        verify(applicants, never()).changeStatus(anyLong(), anyString(), any());
        verify(decisions).save(argThat(d -> "Approved by HR".equals(d.getReason()) && d.getDecidedBy() == 2L));
    }

    @Test
    void hireBeforeHumanInterviewIsRejected() {
        application.setStatus(ApplicationStatus.ASSESSMENT);

        assertThatThrownBy(() -> service.decide(4L, new DecisionRequest(HiringDecisionType.HIRE, null)))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getCode())
                .isEqualTo("DECISION_NOT_ALLOWED");
        verifyNoInteractions(decisions);
    }

    @Test
    void rejectAndHoldRequireReason() {
        application.setStatus(ApplicationStatus.HUMAN_INTERVIEW);

        assertThatThrownBy(() -> service.decide(4L, new DecisionRequest(HiringDecisionType.HOLD, " ")))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getCode())
                .isEqualTo("DECISION_REASON_REQUIRED");

        service.decide(4L, new DecisionRequest(HiringDecisionType.REJECT, "Culture fit"));
        verify(applicants).changeStatus(4L, "REJECTED", "Culture fit");
    }

    @Test
    void closedApplicationCannotBeDecided() {
        application.setStatus(ApplicationStatus.HIRED);

        assertThatThrownBy(() -> service.decide(4L, new DecisionRequest(HiringDecisionType.REJECT, "x")))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getCode())
                .isEqualTo("APPLICATION_CLOSED");
    }

    @Test
    void candidateCannotRecordDecision() {
        when(access.staff()).thenReturn(false);

        assertThatThrownBy(() -> service.decide(4L, new DecisionRequest(HiringDecisionType.HIRE, null)))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getCode())
                .isEqualTo("APPLICATION_FORBIDDEN");
    }

    @Test
    void offerResponseNotifiesJobOwner() {
        when(applications.findById(4L)).thenReturn(Optional.of(application));

        service.respondToOffer(4L, true, null);

        verify(applicants).respondToOffer(4L, true, null);
        verify(notifications).save(argThat(n -> "OFFER_ACCEPTED".equals(n.getType()) && n.getUser() == owner));
    }
}
