package com.smarthire.tenant.aiInterview.service;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.enums.ApplicationStatus;
import com.smarthire.domain.enums.CvScreeningStatus;
import com.smarthire.domain.tenant.entity.AiInterview;
import com.smarthire.domain.tenant.entity.Application;
import com.smarthire.domain.tenant.entity.Job;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class InterviewAvailabilityTest {
    private Application eligibleApplication() {
        var job = new Job();
        job.setAiInterviewEnabled(true);
        job.setAiInterviewAvailableFrom(Instant.now().minusSeconds(3600));
        job.setAiInterviewAvailableUntil(Instant.now().plusSeconds(86400));
        var application = new Application();
        application.setJob(job);
        application.setStatus(ApplicationStatus.INTERVIEW);
        application.setCvScreeningStatus(CvScreeningStatus.PASSED);
        return application;
    }

    @Test void snapshotPreservesWindowAfterJobChanges() {
        var application = eligibleApplication();
        var job = application.getJob();
        job.setAiInterviewAvailableFrom(Instant.parse("2026-10-15T12:04:07.591653900Z"));
        job.setAiInterviewAvailableUntil(Instant.parse("2026-10-16T12:04:07.123456789Z"));
        var from = job.getAiInterviewAvailableFrom();
        var until = job.getAiInterviewAvailableUntil();
        var first = AiInterview.builder().application(application).build();
        InterviewPolicies.snapshot(first);
        String original = first.getConfigSnapshotJson();
        job.setAiInterviewAvailableFrom(from.plusSeconds(3600));
        job.setAiInterviewAvailableUntil(until.plusSeconds(3600));
        InterviewPolicies.snapshot(first);
        assertThat(first.getConfigSnapshotJson()).isEqualTo(original);
        assertThat(InterviewPolicies.config(first).availableFrom()).isEqualTo(from);
        assertThat(InterviewPolicies.config(first).availableUntil()).isEqualTo(until);
        var second = AiInterview.builder().application(application).build();
        InterviewPolicies.snapshot(second);
        assertThat(InterviewPolicies.config(second).availableFrom()).isEqualTo(job.getAiInterviewAvailableFrom());
        assertThat(InterviewPolicies.config(second).availableUntil()).isEqualTo(job.getAiInterviewAvailableUntil());
    }

    @Test void acceptsApplicationInsideWindow() {
        var application = eligibleApplication();
        assertThatCode(() -> AiInterviewEligibility.require(application)).doesNotThrowAnyException();
    }

    @Test void rejectsExpiredJob() {
        var application = eligibleApplication();
        application.getJob().setAiInterviewAvailableUntil(Instant.now().minusSeconds(3600));
        assertThatThrownBy(() -> AiInterviewEligibility.require(application))
                .isInstanceOf(BusinessException.class).hasMessage("AI interview is not available for this job");
    }

    @Test void acceptsJobWithoutDeadline() {
        var application = eligibleApplication();
        application.getJob().setAiInterviewAvailableUntil(null);
        assertThatCode(() -> AiInterviewEligibility.require(application)).doesNotThrowAnyException();
    }

    @Test void existingSessionRemainsEligibleAfterJobDeadlineButNotArchival() {
        var application = eligibleApplication();
        application.getJob().setAiInterviewAvailableUntil(Instant.now().minusSeconds(3600));
        var interview = AiInterview.builder().application(application).build();
        assertThatCode(() -> AiInterviewEligibility.requireExisting(interview)).doesNotThrowAnyException();
        application.setArchivedAt(Instant.now());
        assertThatThrownBy(() -> AiInterviewEligibility.requireExisting(interview))
                .isInstanceOf(BusinessException.class).hasMessage("Application is not in the interview round");
    }
}
