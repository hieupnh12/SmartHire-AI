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
