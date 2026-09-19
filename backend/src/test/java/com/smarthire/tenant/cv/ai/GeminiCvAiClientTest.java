package com.smarthire.tenant.cv.ai;

import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

class GeminiCvAiClientTest {
    @Test
    void promptIncludesJobSkillsAndCvText() {
        String prompt = GeminiCvAiClient.prompt(
                "Jane Doe Java developer",
                "Title: Backend Java Developer\nSkills: Java (required), Spring Boot (required)");
        assertThat(prompt).contains("Backend Java Developer").contains("Java (required)").contains("Jane Doe Java developer");
        assertThat(prompt).contains("Do not invent").contains("screening");
    }
}
