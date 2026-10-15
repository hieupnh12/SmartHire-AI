package com.smarthire.tenant.aiInterview.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.tenant.entity.Job;
import com.smarthire.domain.tenant.repository.ApplicationRepository;
import com.smarthire.domain.tenant.repository.JobRepository;
import com.smarthire.domain.tenant.repository.JobSkillRepository;
import com.smarthire.tenant.aiInterview.ai.AiInterviewClient;
import com.smarthire.tenant.aiInterview.dto.request.AiInterviewConfigRequest;
import com.smarthire.tenant.aiInterview.dto.request.InterviewPolicy;
import com.smarthire.tenant.cv.service.CvAccess;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AiInterviewConfigServiceTest {
    @Mock JobRepository jobs;
    @Mock ApplicationRepository applications;
    @Mock CvAccess access;
    @Mock AiInterviewInvitationService invitations;
    @Mock JobSkillRepository skills;
    @Mock AiInterviewClient ai;
    AiInterviewConfigService service;
    Job job;

    @BeforeEach void setup() {
        service = new AiInterviewConfigService(jobs, applications, access, invitations, skills, ai);
        job = new Job();
        job.setId(1L);
        when(jobs.findById(1L)).thenReturn(Optional.of(job));
    }

    @Test void enablesInvitationsByDefaultBeforeConfigurationIsSaved() {
        assertThat(service.get(1L).enabled()).isTrue();
        assertThat(InterviewPolicies.enabled(job)).isTrue();
        verifyNoInteractions(invitations, applications);
    }

    @Test void preservesExplicitlyDisabledConfiguration() {
        var enabled = processRequest(3);
        when(skills.findByJob_IdOrderByIdAsc(1L)).thenReturn(List.of());
        var disabled = new AiInterviewConfigRequest(false, enabled.passingScore(), enabled.questionCount(),
                enabled.availableFrom(), enabled.availableUntil(), enabled.policy());

        assertThat(service.update(1L, disabled).enabled()).isFalse();
        assertThat(service.get(1L).enabled()).isFalse();
        assertThat(InterviewPolicies.enabled(job)).isFalse();
        verifyNoInteractions(invitations, applications);
    }

    @Test void roadmapSuggestionIsReservedForFutureDevelopment() {
        assertThatThrownBy(() -> service.suggest(1L, request(100)))
                .isInstanceOfSatisfying(BusinessException.class, ex -> assertThat(ex.getCode()).isEqualTo("AI_INTERVIEW_PROCESS_UNAVAILABLE"));
        assertThat(job.getAiInterviewPolicyJson()).isNull();
        verifyNoInteractions(ai, invitations, applications);
    }

    @Test void rejectsInvalidWeightsBeforeCallingProvider() {
        assertThatThrownBy(() -> service.suggest(1L, request(90)))
                .isInstanceOf(BusinessException.class).hasMessageContaining("Communication");
        verifyNoInteractions(ai);
    }

    @Test void rejectsSavingRoadmapWithDifferentQuestionCount() {
        assertThatThrownBy(() -> service.update(1L, request(100)))
                .isInstanceOf(BusinessException.class).hasMessageContaining("Communication");
        assertThat(job.getAiInterviewPolicyJson()).isNull();
        verifyNoInteractions(invitations);
    }

    @Test void storesProcessConfigurationOnTheRequestedJobOnly() {
        var secondJob = new Job();
        secondJob.setId(2L);
        when(jobs.findById(2L)).thenReturn(Optional.of(secondJob));
        when(skills.findByJob_IdOrderByIdAsc(anyLong())).thenReturn(List.of());
        when(applications.findByJob_IdOrderByIdDesc(anyLong())).thenReturn(List.of());

        service.update(1L, processRequest(2));
        service.update(2L, processRequest(4));

        var firstPolicy = InterviewPolicies.read(job.getAiInterviewPolicyJson(), InterviewPolicy.class);
        var secondPolicy = InterviewPolicies.read(secondJob.getAiInterviewPolicyJson(), InterviewPolicy.class);
        assertThat(firstPolicy.processes().getFirst().config()).containsEntry("questionCount", 2);
        assertThat(secondPolicy.processes().getFirst().config()).containsEntry("questionCount", 4);
        assertThat(firstPolicy.durationMinutes()).isEqualTo(10);
        assertThat(secondPolicy.durationMinutes()).isEqualTo(20);
    }

    @Test void derivesDurationAndAcceptsTwoToTenFollowUps() {
        when(skills.findByJob_IdOrderByIdAsc(1L)).thenReturn(List.of());
        var base = processRequest(3);
        var settings = new java.util.LinkedHashMap<String, Object>(base.policy().processes().getFirst().config());
        var p = base.policy();
        var policy = new InterviewPolicy(180, p.maxAttempts(), false, 3, 0, 0, p.weights(), p.selectedSkills(), List.of(),
                2, null, null, null, List.of(new InterviewPolicy.Process("COMMUNICATION", true, 1, 100, settings)));
        var request = new AiInterviewConfigRequest(false, base.passingScore(), 3, null, policy);
        for (int maximum : List.of(2, 10)) {
            settings.put("maxFollowUp", maximum);
            var saved = service.update(1L, request);
            assertThat(saved.policy().durationMinutes()).isEqualTo(15);
            assertThat(saved.policy().processes().getFirst().config()).containsEntry("maxFollowUp", maximum);
        }
        for (int invalid : List.of(0, 1, 11)) {
            settings.put("maxFollowUp", invalid);
            assertThatThrownBy(() -> service.update(1L, request)).isInstanceOf(BusinessException.class).hasMessageContaining("2–10");
        }
        settings.put("followUpEnabled", false);
        assertThat(service.update(1L, request).policy().durationMinutes()).isEqualTo(15);
    }

    @Test void savesAssessmentSettingsAndRejectsInvalidCriteriaBeforePersisting() {
        when(skills.findByJob_IdOrderByIdAsc(1L)).thenReturn(List.of());
        var settings = new java.util.LinkedHashMap<String, Object>();
        settings.put("questionCount", 3);
        settings.put("technicalKnowledgeWeight", 40); settings.put("problemSolvingWeight", 30);
        settings.put("reasoningWeight", 20); settings.put("communicationWeight", 10);
        settings.put("assessmentFocus", "API debugging");
        var base = processRequest(3);
        var policy = base.policy();
        var configured = new InterviewPolicy(policy.durationMinutes(), policy.maxAttempts(), false, 3, 0, 0,
                policy.weights(), policy.selectedSkills(), List.of(), 2, null, null, null,
                List.of(new InterviewPolicy.Process("COMMUNICATION", true, 1, 100, settings)));
        var request = new AiInterviewConfigRequest(false, base.passingScore(), 3, null, configured);
        var saved = service.update(1L, request);
        assertThat(saved.policy().processes().getFirst().config()).containsEntry("assessmentFocus", "API debugging")
                .containsEntry("technicalKnowledgeWeight", 40);
        String original = job.getAiInterviewPolicyJson();
        for (Object invalid : List.of(-1, 101, 2.5, 39, "invalid")) {
            settings.put("technicalKnowledgeWeight", invalid);
            assertThatThrownBy(() -> service.update(1L, request)).isInstanceOf(BusinessException.class);
            assertThat(job.getAiInterviewPolicyJson()).isEqualTo(original);
        }
        settings.put("technicalKnowledgeWeight", 40);
        settings.put("assessmentFocus", "x".repeat(2001));
        assertThatThrownBy(() -> service.update(1L, request)).isInstanceOf(BusinessException.class);
        assertThat(job.getAiInterviewPolicyJson()).isEqualTo(original);
    }

    @Test void relativeScheduleRoundTripsAndClearsStaleAbsoluteDates() {
        when(skills.findByJob_IdOrderByIdAsc(1L)).thenReturn(List.of());
        var base = processRequest(3);
        var policy = base.policy().withAvailability(new InterviewPolicy.Availability("RELATIVE", 6, 48));
        var stale = java.time.Instant.parse("2000-01-01T00:00:00Z");
        var saved = service.update(1L, new AiInterviewConfigRequest(false, base.passingScore(), 3, stale, stale, policy));
        assertThat(saved.policy().availability()).isEqualTo(policy.availability());
        assertThat(saved.availableFrom()).isNull(); assertThat(saved.availableUntil()).isNull();
        assertThat(job.getAiInterviewAvailableFrom()).isNull(); assertThat(job.getAiInterviewAvailableUntil()).isNull();
        assertThat(service.get(1L).policy().availability()).isEqualTo(policy.availability());
    }

    private AiInterviewConfigRequest processRequest(int questionCount) {
        var policy = new InterviewPolicy(30, 1, false, 3, 30, 0,
                Map.of("TECHNICAL_KNOWLEDGE", 35, "PROBLEM_SOLVING", 25,
                        "PRACTICAL_EXPERIENCE", 20, "COMMUNICATION", 10, "BEHAVIORAL_SITUATIONAL", 10),
                List.of(), List.of(), 2, null, null, null,
                List.of(new InterviewPolicy.Process("COMMUNICATION", true, 1, 100,
                        Map.of("questionCount", questionCount))));
        return new AiInterviewConfigRequest(true, new BigDecimal("70"), questionCount, null, policy);
    }

    private AiInterviewConfigRequest request(int technicalWeight) {
        var policy = new InterviewPolicy(30, 1, false, 3, 30, 0,
                Map.of("TECHNICAL_KNOWLEDGE", technicalWeight, "PROBLEM_SOLVING", 0,
                        "PRACTICAL_EXPERIENCE", 0, "COMMUNICATION", 0, "BEHAVIORAL_SITUATIONAL", 0),
                List.of(), List.of(new InterviewPolicy.Stage("Old roadmap", 1,
                        List.of("TECHNICAL_KNOWLEDGE"), List.of())));
        return new AiInterviewConfigRequest(true, new BigDecimal("70"), 2, null, policy);
    }
}
