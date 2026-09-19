package com.smarthire.tenant.cv;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.tenant.cv.ai.HeuristicCvAiClient;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

class HeuristicCvAiClientTest {
    private final HeuristicCvAiClient client = new HeuristicCvAiClient(new ObjectMapper());

    @Test
    void extractsContactSkillsAndExperienceContract() throws Exception {
        String json = client.extractJson("""
                Jane Doe
                jane@example.com
                +84 909 111 222
                Skills: Java, Spring Boot, ReactJS
                Worked as Java developer 2024-01 to 2025-06 at Acme
                """);
        var tree = new ObjectMapper().readTree(json);
        assertThat(tree.path("contact").path("email").asText()).isEqualTo("jane@example.com");
        assertThat(tree.path("skills").toString()).contains("Java").contains("ReactJS");
        assertThat(tree.path("experience").get(0).path("startDate").asText()).isEqualTo("2024-01");
        assertThat(tree.path("experience").get(0).path("endDate").asText()).isEqualTo("2025-06");
        assertThat(tree.path("experience").get(0).path("skills").toString()).contains("Java");
        assertThat(tree.path("experience").get(0).path("evidence").asText()).isNotBlank();
        assertThat(tree.path("education").isArray()).isTrue();
    }

    @Test
    void readsConsultantDatesEducationAndDoesNotTreatGoToMarketAsGo() throws Exception {
        String json = client.extractJson("""
                Strategic and analytical Business Consultant with 7 years of experience.
                Senior Business Consultant September, 2020 – Present
                Business Analyst / Junior Consultant July, 2017 – August, 2020
                EDUCATION
                Master of Science in Human Development
                Graduated: June, 2017
                Bachelor of Science in Economics
                Graduated: July, 2015
                go-to-market plan
                SKILLS
                Consulting & Strategy: Management Consulting, Strategic Planning, Business Transformation
                """);
        var tree = new ObjectMapper().readTree(json);
        assertThat(tree.path("experience")).hasSize(2);
        assertThat(tree.path("experience").get(0).path("startDate").asText()).isEqualTo("2020-09");
        assertThat(tree.path("experience").get(0).path("current").asBoolean()).isTrue();
        assertThat(tree.path("experience").get(1).path("startDate").asText()).isEqualTo("2017-07");
        assertThat(tree.path("experience").get(1).path("endDate").asText()).isEqualTo("2020-08");
        assertThat(tree.path("education").toString())
                .contains("Master of Science in Human Development")
                .contains("Bachelor of Science in Economics");
        assertThat(tree.path("skills").toString()).contains("Strategic Planning").doesNotContain("\"Go\"");
    }
}
