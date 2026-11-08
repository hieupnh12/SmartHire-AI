package com.smarthire.tenant.assessment.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.enums.TestSubmissionStatus;
import com.smarthire.domain.tenant.entity.Candidate;
import com.smarthire.domain.tenant.entity.ProctorEvent;
import com.smarthire.domain.tenant.entity.ProctorReport;
import com.smarthire.domain.tenant.entity.Submission;
import com.smarthire.domain.tenant.repository.ProctorEventRepository;
import com.smarthire.domain.tenant.repository.ProctorReportRepository;
import com.smarthire.domain.tenant.repository.SubmissionRepository;
import com.smarthire.tenant.assessment.dto.request.AssessmentProctorEventRequest;
import com.smarthire.tenant.cv.service.CvAccess;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class AssessmentProctorServiceTest {
    final SubmissionRepository submissions = mock(SubmissionRepository.class);
    final ProctorEventRepository events = mock(ProctorEventRepository.class);
    final ProctorReportRepository reports = mock(ProctorReportRepository.class);
    final CvAccess access = mock(CvAccess.class);
    final AssessmentProctorService service = new AssessmentProctorService(submissions, events, reports, access, new ObjectMapper());

    @Test
    void riskWeightsEventsAndCapsAtHundred() {
        var low = ProctorRisk.of(List.of(event("WINDOW_BLUR"), event("CONTEXT_MENU")));
        assertThat(low.score()).isEqualByComparingTo("7");
        assertThat(low.level()).isEqualTo("LOW");

        var medium = ProctorRisk.of(List.of(event("MULTI_FACE"), event("PAGE_HIDDEN")));
        assertThat(medium.score()).isEqualByComparingTo("40");
        assertThat(medium.level()).isEqualTo("MEDIUM");

        var high = ProctorRisk.of(List.of(event("MULTI_FACE"), event("MULTI_FACE"), event("MULTI_FACE"),
                event("CAMERA_LOST"), event("SCREEN_SHARE_STOPPED")));
        assertThat(high.score()).isEqualByComparingTo("100");
        assertThat(high.level()).isEqualTo("HIGH");
        assertThat(high.counts()).containsEntry("MULTI_FACE", 3);
    }

    @Test
    void recordsFaceEventAndUpsertsReport() {
        var submission = openSubmission();
        var existing = ProctorReport.builder().id(5L).submission(submission).riskScore(BigDecimal.ZERO).build();
        when(events.findBySubmission_IdOrderByCreatedAtAsc(9L)).thenReturn(List.of(event("LOST_FACE"), event("MULTI_FACE")));
        when(reports.findBySubmission_Id(9L)).thenReturn(Optional.of(existing));

        service.record(9L, new AssessmentProctorEventRequest("MULTI_FACE", "2 faces"));

        verify(events).save(any(ProctorEvent.class));
        var saved = ArgumentCaptor.forClass(ProctorReport.class);
        verify(reports).save(saved.capture());
        assertThat(saved.getValue().getId()).isEqualTo(5L);
        assertThat(saved.getValue().getRiskScore()).isEqualByComparingTo("40");
        assertThat(saved.getValue().getSummaryJson()).contains("\"level\":\"MEDIUM\"").contains("\"LOST_FACE\":1");
    }

    @Test
    void rejectsUnknownEventWithoutReport() {
        openSubmission();
        assertThatThrownBy(() -> service.record(9L, new AssessmentProctorEventRequest("DEVTOOLS", null)))
                .isInstanceOf(BusinessException.class).hasMessageContaining("Unsupported");
        verify(reports, never()).save(any());
    }

    private Submission openSubmission() {
        var candidate = new Candidate();
        candidate.setId(3L);
        var submission = new Submission();
        submission.setId(9L);
        submission.setStatus(TestSubmissionStatus.IN_PROGRESS);
        when(access.candidate()).thenReturn(true);
        when(access.candidateActor()).thenReturn(candidate);
        when(submissions.findOwnedLocked(9L, 3L)).thenReturn(Optional.of(submission));
        return submission;
    }

    private static ProctorEvent event(String type) {
        var event = new ProctorEvent();
        event.setEventType(type);
        return event;
    }
}
