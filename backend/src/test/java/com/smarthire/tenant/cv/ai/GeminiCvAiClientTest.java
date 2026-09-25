package com.smarthire.tenant.cv.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

class GeminiCvAiClientTest {
    @Test
    void promptIncludesJobSkillsAndCvText() {
        String prompt = GeminiCvAiClient.prompt(
                "Jane Doe Java developer",
                "Title: Backend Java Developer\nSkills: Java (required), Spring Boot (required)");
        assertThat(prompt).contains("Backend Java Developer").contains("Java (required)").contains("Jane Doe Java developer");
        assertThat(prompt).contains("Do not invent").contains("screening")
                .contains("MISSING").contains("UNKNOWN").contains("Do not output an overall score");
    }

    @Test
    void blankKeyUsesHeuristicFallback() {
        var mapper = new ObjectMapper();
        var client = new GeminiCvAiClient(new HeuristicCvAiClient(mapper), mapper, "", "gemini-2.0-flash", 5);
        String json = client.extractJson("Jane Doe Java Spring Boot developer", "Title: Backend");
        assertThat(json).contains("Java").contains("Spring Boot");
        assertThat(client.modelVersion()).isEqualTo(HeuristicCvAiClient.MODEL);
    }
}
