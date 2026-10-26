package com.smarthire.tenant.assessment.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.domain.tenant.entity.CodingProblem;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CodingJudgeTest {
    private final ObjectMapper json = new ObjectMapper();

    @Test
    void detectsRapidApiFromUrlAndHost() {
        CodingJudge judge1 = new CodingJudge("https://judge0-ce.p.rapidapi.com", "my-key");
        assertThat(judge1.isRapidApi()).isTrue();
        assertThat(judge1.getHost()).isEqualTo("judge0-ce.p.rapidapi.com");

        CodingJudge judge2 = new CodingJudge("https://custom-domain.com", "my-key", "judge0-extra-ce.p.rapidapi.com");
        assertThat(judge2.isRapidApi()).isTrue();
        assertThat(judge2.getHost()).isEqualTo("judge0-extra-ce.p.rapidapi.com");

        CodingJudge judge3 = new CodingJudge("http://localhost:2358", "");
        assertThat(judge3.isRapidApi()).isFalse();
        assertThat(judge3.getHost()).isEqualTo("localhost");
    }

    @Test
    void rejectsEmptyUrl() {
        CodingProblem problem = new CodingProblem();
        CodingJudge judge = new CodingJudge("", "");

        assertThatThrownBy(() -> judge.run(problem, "java", "code", "", ""))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Coding sandbox is not configured");
    }

    @Test
    void requiresRapidApiKeyWhenConfiguredForRapidApi() throws Exception {
        CodingProblem problem = new CodingProblem();
        problem.setHarnessJson(json.readTree("{\"python\":\"{{SOURCE}}\"}"));
        CodingJudge judge = new CodingJudge("https://judge0-ce.p.rapidapi.com", "");

        assertThatThrownBy(() -> judge.run(problem, "python", "print(1)", "", ""))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("RapidAPI key is not configured");
    }

    @Test
    void rejectsUnsupportedLanguage() throws Exception {
        CodingProblem problem = new CodingProblem();
        problem.setHarnessJson(json.readTree("{\"ruby\":\"{{SOURCE}}\"}"));
        CodingJudge judge = new CodingJudge("http://localhost:2358", "token");

        assertThatThrownBy(() -> judge.run(problem, "ruby", "puts 1", "", ""))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Unsupported language");
    }
}
