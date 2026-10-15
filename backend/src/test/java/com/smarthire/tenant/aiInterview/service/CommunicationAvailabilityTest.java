package com.smarthire.tenant.aiInterview.service;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.tenant.entity.AiInterview;
import com.smarthire.domain.tenant.entity.Job;
import com.smarthire.tenant.aiInterview.dto.request.AiInterviewConfigRequest;
import com.smarthire.tenant.aiInterview.dto.request.InterviewPolicy;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class CommunicationAvailabilityTest {
    @Test
    void legacyJobUsesCommunicationWithoutRewritingStorage() {
        Job job = new Job();
        String legacy = InterviewPolicies.json(InterviewPolicies.defaults());
        job.setAiInterviewPolicyJson(legacy);
        var config = InterviewPolicies.config(job);
        assertThat(config.questionCount()).isEqualTo(3);
        assertThat(config.policy().weights()).containsEntry("COMMUNICATION", 100).containsEntry("TECHNICAL_KNOWLEDGE", 0);
        assertThat(config.policy().miniAssessmentEnabled()).isFalse();
        assertThat(config.policy().voice().enabled()).isTrue();
        assertThat(config.policy().voice().recordAudio()).isTrue();
        assertThat(config.policy().processes()).filteredOn(InterviewPolicy.Process::enabled)
                .extracting(InterviewPolicy.Process::key).containsExactly("COMMUNICATION");
        assertThat(config.policy().processes().getLast().config()).containsEntry("followUpEnabled", true);
        assertThat(job.getAiInterviewPolicyJson()).isEqualTo(legacy);
        assertThatCode(() -> InterviewPolicies.requireCommunicationOnly(config.policy())).doesNotThrowAnyException();
    }
    @Test
    void derivesDurationFromMainQuestionsAndPreservesCommunicationSettings() {
        var base = InterviewPolicies.defaults();
        var source = new InterviewPolicy(20, 2, false, 3, 0, 0, base.weights(), List.of(), List.of(), 2,
                "TEXT", null, null, List.of(
                new InterviewPolicy.Process("TECHNICAL_KNOWLEDGE", true, 1, 35, Map.of("questionCount", 10)),
                new InterviewPolicy.Process("COMMUNICATION", true, 2, 10, Map.of("questionCount", 2, "language", "Vietnamese", "followUpEnabled", false, "followUpSettingVersion", 1))));
        var policy = InterviewPolicies.communicationPolicy(source);
        assertThat(policy.durationMinutes()).isEqualTo(5);
        assertThat(policy.processes().getFirst().enabled()).isFalse();
        assertThat(policy.processes().getLast().config()).containsEntry("questionCount", 1).containsEntry("language", "Vietnamese");
        assertThatThrownBy(() -> InterviewPolicies.requireCommunicationOnly(source)).isInstanceOf(BusinessException.class);
    }
    @Test
    void blocksLegacyPoliciesAndKeepsSnapshot() {
        var snapshot = InterviewPolicies.json(new AiInterviewConfigRequest(true, java.math.BigDecimal.valueOf(70), 10, null, null, InterviewPolicies.defaults()));
        var interview = new AiInterview();
        interview.setConfigSnapshotJson(snapshot);
        assertThatThrownBy(() -> InterviewPolicies.requireCommunicationOnly(InterviewPolicies.config(interview).policy()))
                .isInstanceOf(BusinessException.class);
        assertThat(interview.getConfigSnapshotJson()).isEqualTo(snapshot);
        assertThat(InterviewPolicies.communicationOnly(null)).isFalse();
    }

    @Test void legacyUncheckedSettingDefaultsToEnabledWithoutRewritingExistingSnapshots() {
        var job = new Job();
        var base = InterviewPolicies.config(job).policy();
        var json = (com.fasterxml.jackson.databind.node.ObjectNode) InterviewPolicies.tree(InterviewPolicies.json(base));
        var settings = (com.fasterxml.jackson.databind.node.ObjectNode) json.path("processes").get(0).path("config");
        settings.remove("followUpSettingVersion");
        settings.put("followUpEnabled", false).put("maxFollowUp", 2).put("questionCount", 1);
        job.setAiInterviewPolicyJson(json.toString());
        var corrected = InterviewPolicies.config(job);
        assertThat(corrected.questionCount()).isEqualTo(3);
        assertThat(corrected.policy().durationMinutes()).isEqualTo(15);
        assertThat(corrected.policy().processes().getFirst().config()).containsEntry("followUpEnabled", true);
        assertThat(job.getAiInterviewPolicyJson()).isEqualTo(json.toString());
    }
}
