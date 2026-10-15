package com.smarthire.tenant.aiInterview;

import com.smarthire.domain.tenant.entity.*;
import com.smarthire.tenant.aiInterview.mapper.AiInterviewMapper;
import com.smarthire.tenant.aiInterview.service.InterviewPolicies;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class AiInterviewQuestionCountTest {
    @Test void invitationUsesOneOpeningPlusConfiguredFollowUpsAndFiveMinutesPerQuestion() {
        var job = new Job(); job.setId(26L);
        var application = new Application(); application.setJob(job);
        var interview = AiInterview.builder().application(application).build();
        var mapper = new AiInterviewMapper();
        InterviewPolicies.snapshot(interview);
        var response = mapper.toResponse(interview);
        assertThat(response.questionCount()).isEqualTo(3);
        assertThat(response.maxQuestionCount()).isEqualTo(3);
        assertThat(response.roadmap()).hasSize(1);
        assertThat(response.roadmap().getFirst().questionCount()).isEqualTo(3);
        assertThat(response.durationMinutes()).isEqualTo(15);
        var policy = (ObjectNode) InterviewPolicies.tree(InterviewPolicies.json(InterviewPolicies.config(job).policy()));
        var settings = (ObjectNode) policy.path("processes").get(0).path("config");
        settings.put("followUpEnabled", false);
        job.setAiInterviewPolicyJson(policy.toString());
        interview.setConfigSnapshotJson(null);
        InterviewPolicies.snapshot(interview);
        assertThat(mapper.toResponse(interview).questionCount()).isEqualTo(1);
        assertThat(mapper.toResponse(interview).maxQuestionCount()).isEqualTo(1);
        assertThat(mapper.toResponse(interview).durationMinutes()).isEqualTo(5);
        settings.put("followUpEnabled", true).put("questionCount", 10).put("maxFollowUp", 10);
        job.setAiInterviewPolicyJson(policy.toString());
        interview.setConfigSnapshotJson(null);
        InterviewPolicies.snapshot(interview);
        assertThat(mapper.toResponse(interview).questionCount()).isEqualTo(11);
        assertThat(mapper.toResponse(interview).maxQuestionCount()).isEqualTo(11);
        assertThat(mapper.toResponse(interview).durationMinutes()).isEqualTo(55);
        var snapshot = (ObjectNode) InterviewPolicies.tree(interview.getConfigSnapshotJson());
        snapshot.remove("questionBudgetVersion");
        ((ObjectNode) snapshot.path("policy").path("processes").get(0).path("config")).put("questionCount", 10);
        interview.setConfigSnapshotJson(snapshot.toString());
        assertThat(mapper.toResponse(interview).maxQuestionCount()).isEqualTo(110);
    }
}
