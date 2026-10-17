package com.smarthire.tenant.aiInterview;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.config.ai.DynamicAiConfigProvider;
import com.smarthire.tenant.aiInterview.ai.AiInterviewClient;
import java.math.BigDecimal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class AiInterviewClientTest {
    private final ObjectMapper mapper = new ObjectMapper();
    private static final String BASE = "https://interview.example/v1";
    private final DynamicAiConfigProvider dynamic = mock(DynamicAiConfigProvider.class);
    private MockRestServiceServer server;
    private AiInterviewClient client;

    @BeforeEach void setup() {
        var builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        client = new AiInterviewClient(dynamic, builder, mapper);
        when(dynamic.resolveConfig("INTERVIEW_GEN")).thenReturn(resolved("INTERVIEW_GEN", "admin-secret"));
        when(dynamic.resolveConfig("INTERVIEW_NLP")).thenReturn(resolved("INTERVIEW_NLP", "nlp-secret"));
    }

    private DynamicAiConfigProvider.ResolvedAiConfig resolved(String task, String key) {
        return new DynamicAiConfigProvider.ResolvedAiConfig(task, "GEMINI", "gemini-admin", key, BASE,
                new BigDecimal("0.2"), 8192, 30, null, null);
    }

    private String response(String content, String reason) throws Exception {
        return "{\"id\":\"chat-1\",\"object\":\"chat.completion\",\"created\":1,\"model\":\"gemini-admin\",\"choices\":[{\"index\":0,\"finish_reason\":"
                + mapper.writeValueAsString(reason) + ",\"message\":{\"role\":\"assistant\",\"content\":" + mapper.writeValueAsString(content) + "}}]}";
    }

    @Test void springAiSendsGeminiKeyAndStructuredPrompt() throws Exception {
        var data = mapper.createObjectNode().put("jobDescription", "Explain {API} <Java> and JSON objects");
        server.expect(requestTo(BASE + "/chat/completions"))
                .andExpect(header("Authorization", "Bearer admin-secret"))
                .andExpect(jsonPath("$.model").value("gemini-admin"))
                .andExpect(jsonPath("$.response_format.type").value("json_object"))
                .andExpect(jsonPath("$.max_tokens").value(8192))
                .andExpect(jsonPath("$.messages[0].role").value("system"))
                .andExpect(jsonPath("$.messages[1].content").value(mapper.writeValueAsString(data)))
                .andRespond(withSuccess(response("{}", "stop"), MediaType.APPLICATION_JSON));
        assertTrue(client.generate("Generate questions", data).isObject());
        server.verify();
    }

    @Test void scoringUsesItsOwnTaskAndKey() throws Exception {
        server.expect(requestTo(BASE + "/chat/completions"))
                .andExpect(header("Authorization", "Bearer nlp-secret"))
                .andRespond(withSuccess(response("{}", "stop"), MediaType.APPLICATION_JSON));
        assertTrue(client.evaluate("Evaluate answer", mapper.createObjectNode()).isObject());
        verify(dynamic).resolveConfig("INTERVIEW_NLP");
        verify(dynamic, never()).resolveConfig("INTERVIEW_GEN");
        server.verify();
    }

    @Test void rateLimitRetriesBeforeReturningValidOutput() throws Exception {
        server.expect(requestTo(BASE + "/chat/completions"))
                .andRespond(withStatus(HttpStatus.TOO_MANY_REQUESTS).body("quota admin-secret"));
        server.expect(requestTo(BASE + "/chat/completions"))
                .andRespond(withSuccess(response("{}", "stop"), MediaType.APPLICATION_JSON));
        assertTrue(client.generate("Generate questions", mapper.createObjectNode()).isObject());
        server.verify();
    }

    @Test void exhaustedProviderFailureExposesSafeStatus() {
        for (int i = 0; i < 3; i++) server.expect(requestTo(BASE + "/chat/completions"))
                .andRespond(withStatus(HttpStatus.SERVICE_UNAVAILABLE).body("sensitive candidate data admin-secret"));
        var error = assertThrows(AiInterviewClient.ProviderException.class,
                () -> client.generate("Generate questions", mapper.createObjectNode()));
        assertTrue(error.getMessage().contains("503"));
        assertFalse(error.getMessage().contains("admin-secret"));
        assertFalse(error.getMessage().contains("candidate data"));
        assertNull(error.getCause());
        server.verify();
    }

    @Test void authenticationFailureIsNotRetried() {
        server.expect(requestTo(BASE + "/chat/completions"))
                .andRespond(withStatus(HttpStatus.FORBIDDEN).body("admin-secret"));
        assertThrows(AiInterviewClient.ProviderException.class,
                () -> client.generate("Generate questions", mapper.createObjectNode()));
        server.verify();
    }

    @Test void truncatedOutputIsRejected() throws Exception {
        server.expect(requestTo(BASE + "/chat/completions"))
                .andRespond(withSuccess(response("{}", "length"), MediaType.APPLICATION_JSON));
        assertThrows(IllegalStateException.class, () -> client.generate("Generate", mapper.createObjectNode()));
        server.verify();
    }

    @Test void malformedOutputDoesNotLeakContent() throws Exception {
        server.expect(requestTo(BASE + "/chat/completions"))
                .andRespond(withSuccess(response("private candidate text", "stop"), MediaType.APPLICATION_JSON));
        var error = assertThrows(IllegalStateException.class, () -> client.generate("Generate", mapper.createObjectNode()));
        assertFalse(error.getMessage().contains("private candidate"));
        assertNull(error.getCause());
        server.verify();
    }

    @Test void legacyBaseUrlStillConnectsToGeminiCompatibilityEndpoint() throws Exception {
        when(dynamic.resolveConfig("INTERVIEW_GEN")).thenReturn(new DynamicAiConfigProvider.ResolvedAiConfig(
                "INTERVIEW_GEN", "GEMINI", "gemini-admin", "admin-secret",
                "https://generativelanguage.googleapis.com/v1beta/models/", new BigDecimal("0.2"), 8192, 30, null, null));
        server.expect(requestTo("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"))
                .andRespond(withSuccess(response("{}", "stop"), MediaType.APPLICATION_JSON));
        assertTrue(client.generate("Generate", mapper.createObjectNode()).isObject());
        server.verify();
    }

    @Test void primaryRateLimitFailsOverToSecondaryModelWhenConfigured() throws Exception {
        var withFailover = new DynamicAiConfigProvider.ResolvedAiConfig(
                "INTERVIEW_GEN", "GEMINI", "gemini-3.8-flash", "admin-secret", BASE,
                new BigDecimal("0.2"), 8192, 30, "GEMINI", "gemini-3.5-flash-lite");
        when(dynamic.resolveConfig("INTERVIEW_GEN")).thenReturn(withFailover);

        server.expect(requestTo(BASE + "/chat/completions"))
                .andExpect(jsonPath("$.model").value("gemini-3.8-flash"))
                .andRespond(withStatus(HttpStatus.TOO_MANY_REQUESTS).body("RPD exhausted"));
        server.expect(requestTo(BASE + "/chat/completions"))
                .andExpect(jsonPath("$.model").value("gemini-3.5-flash-lite"))
                .andRespond(withSuccess(response("{\"questions\":[]}", "stop"), MediaType.APPLICATION_JSON));

        var result = client.generate("Generate questions", mapper.createObjectNode());
        assertTrue(result.has("questions"));
        server.verify();
    }

    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(strings = {"https://llama.example/v1", "https://llama.example/v1/chat/completions/"})
    void openAiCompatibleProviderUsesConfiguredModelAndEndpoint(String endpoint) throws Exception {
        when(dynamic.resolveConfig("INTERVIEW_GEN")).thenReturn(new DynamicAiConfigProvider.ResolvedAiConfig(
                "INTERVIEW_GEN", "OPENAI", "vanilj/llama-3-8b-instruct-32k-v0.1:Q4_K_M", "llama-key", endpoint,
                BigDecimal.ZERO, 2048, 30, null, null));
        server.expect(requestTo("https://llama.example/v1/chat/completions"))
                .andExpect(header("Authorization", "Bearer llama-key"))
                .andExpect(jsonPath("$.model").value("vanilj/llama-3-8b-instruct-32k-v0.1:Q4_K_M"))
                .andRespond(withSuccess(response("{}", "stop"), MediaType.APPLICATION_JSON));
        assertTrue(client.generate("Generate", mapper.createObjectNode()).isObject());
        server.verify();
    }

    @Test void ollamaWithoutKeyUsesConfiguredEndpoint() throws Exception {
        when(dynamic.resolveConfig("INTERVIEW_GEN")).thenReturn(new DynamicAiConfigProvider.ResolvedAiConfig(
                "INTERVIEW_GEN", "OLLAMA", "llama3", "", "https://llama.example/v1/chat/completions",
                BigDecimal.ZERO, 2048, 30, null, null));
        server.expect(requestTo("https://llama.example/v1/chat/completions"))
                .andExpect(header("Authorization", "Bearer ollama"))
                .andExpect(jsonPath("$.model").value("llama3"))
                .andRespond(withSuccess(response("{}", "stop"), MediaType.APPLICATION_JSON));
        assertTrue(client.generate("Generate", mapper.createObjectNode()).isObject());
        server.verify();
    }

    @Test void customProviderRequiresEndpoint() {
        when(dynamic.resolveConfig("INTERVIEW_GEN")).thenReturn(new DynamicAiConfigProvider.ResolvedAiConfig(
                "INTERVIEW_GEN", "CUSTOM", "llama", "custom-key", null, BigDecimal.ZERO, 2048, 30, null, null));
        var error = assertThrows(IllegalStateException.class, () -> client.generate("Generate", mapper.createObjectNode()));
        assertTrue(error.getMessage().contains("Endpoint URL"));
        server.verify();
    }

    @Test void taskWithoutDbKeyIsReportedAsNotConfigured() {
        when(dynamic.resolveConfig("INTERVIEW_GEN")).thenReturn(new DynamicAiConfigProvider.ResolvedAiConfig(
                "INTERVIEW_GEN", "OPENAI", "llama", "", "https://llama.example/v1", BigDecimal.ZERO, 2048, 30, null, null));
        var error = assertThrows(IllegalStateException.class, () -> client.generate("Generate", mapper.createObjectNode()));
        assertTrue(error.getMessage().contains("not configured"));
        server.verify();
    }

    @Test void assessmentGradingUsesCodeGradingTask() throws Exception {
        when(dynamic.resolveConfig("CODE_GRADING")).thenReturn(resolved("CODE_GRADING", "grading-secret"));
        server.expect(requestTo(BASE + "/chat/completions"))
                .andExpect(header("Authorization", "Bearer grading-secret"))
                .andRespond(withSuccess(response("{}", "stop"), MediaType.APPLICATION_JSON));
        assertTrue(client.gradeAssessment("Grade", mapper.createObjectNode()).isObject());
        verify(dynamic, never()).resolveConfig("INTERVIEW_NLP");
        server.verify();
    }
}
