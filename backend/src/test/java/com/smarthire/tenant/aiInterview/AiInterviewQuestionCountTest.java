package com.smarthire.tenant.aiInterview;

import com.smarthire.domain.tenant.entity.*;
import com.smarthire.tenant.aiInterview.mapper.AiInterviewMapper;
import com.smarthire.tenant.aiInterview.service.InterviewPolicies;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class AiInterviewQuestionCountTest {
    @Test void invitationCountUsesMainQuestionsRegardlessOfFollowUps() {
        var job = new Job(); job.setId(26L);
        var application = new Application(); application.setJob(job);
        var interview = AiInterview.builder().application(application).build();
        InterviewPolicies.snapshot(interview);
        var snapshot = (ObjectNode) InterviewPolicies.tree(interview.getConfigSnapshotJson());
        var settings = (ObjectNode) snapshot.path("policy").path("processes").get(0).path("config");
        settings.put("questionCount", 1).put("maxFollowUp", 2).put("followUpEnabled", true);
        ((ObjectNode) snapshot.path("policy")).put("durationMinutes", 5);
        interview.setConfigSnapshotJson(snapshot.toString());
        var mapper = new AiInterviewMapper();
        var response = mapper.toResponse(interview);
        assertThat(response.questionCount()).isEqualTo(1);
        assertThat(response.roadmap()).hasSize(1);
        assertThat(response.roadmap().getFirst().questionCount()).isEqualTo(1);
        assertThat(response.durationMinutes()).isEqualTo(5);
        settings.put("followUpEnabled", false);
        interview.setConfigSnapshotJson(snapshot.toString());
        assertThat(mapper.toResponse(interview).questionCount()).isEqualTo(1);
        settings.put("followUpEnabled", true).put("questionCount", 10).put("maxFollowUp", 10);
        interview.setConfigSnapshotJson(snapshot.toString());
        assertThat(mapper.toResponse(interview).questionCount()).isEqualTo(10);
    }
}
