package com.smarthire.tenant.aiInterview;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.config.ai.DynamicAiConfigProvider;
import com.smarthire.tenant.aiInterview.ai.AiInterviewAiConfig;
import com.smarthire.tenant.aiInterview.ai.AiInterviewClient;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.math.BigDecimal;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClient;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class AssessmentAiHttpTest {
    final String model = "vanilj/llama-3-8b-instruct-32k-v0.1:Q4_K_M";
    final ObjectMapper json = new ObjectMapper();

    @Test void sendsRequestedModelToConfiguredEndpointAndParsesJson() throws Exception {
        var received = new AtomicReference<JsonNode>();
        var server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/v1/chat/completions", exchange -> {
            received.set(json.readTree(exchange.getRequestBody()));
            byte[] body = json.writeValueAsBytes(java.util.Map.of("id", "test", "object", "chat.completion", "created", 1,
                    "model", model, "choices", java.util.List.of(java.util.Map.of("index", 0, "finish_reason", "stop",
                    "message", java.util.Map.of("role", "assistant", "content", "{\"question\":{\"questionText\":\"test\"}}")))));
            exchange.getResponseHeaders().add("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, body.length);
            exchange.getResponseBody().write(body); exchange.close();
        });
        server.start();
        try {
            var dynamic = mock(DynamicAiConfigProvider.class);
            when(dynamic.resolveConfig("ASSESSMENT_GEN")).thenReturn(new DynamicAiConfigProvider.ResolvedAiConfig(
                    "ASSESSMENT_GEN", "OPENAI", model, "", "http://127.0.0.1:" + server.getAddress().getPort() + "/v1/chat/completions",
                    BigDecimal.valueOf(0.3), 8192, 120, null, null));
            var client = new AiInterviewClient(new AiInterviewAiConfig(), dynamic, RestClient.builder(), json);
            assertThat(client.generateAssessment("Generate a draft", json.createObjectNode()).path("question").path("questionText").asText()).isEqualTo("test");
            assertThat(received.get().path("model").asText()).isEqualTo(model);
            assertThat(received.get().path("response_format").path("type").asText()).isEqualTo("json_object");
            verify(dynamic).resolveConfig("ASSESSMENT_GEN");
        } finally { server.stop(0); }
    }

    @Test void missingEndpointNeverFallsBackToPublicOpenAi() {
        var dynamic = mock(DynamicAiConfigProvider.class);
        when(dynamic.resolveConfig("ASSESSMENT_GEN")).thenReturn(new DynamicAiConfigProvider.ResolvedAiConfig(
                "ASSESSMENT_GEN", "OPENAI", model, "", null, BigDecimal.ZERO, 8192, 120, null, null));
        var client = new AiInterviewClient(new AiInterviewAiConfig(), dynamic, RestClient.builder(), json);
        assertThatThrownBy(() -> client.generateAssessment("Generate", json.createObjectNode()))
                .isInstanceOf(IllegalStateException.class).hasMessage("Assessment AI endpoint is not configured");
    }

    @Test void gradingSendsLlamaModelAndUsesDedicatedTask() throws Exception {
        var received = new AtomicReference<JsonNode>();
        var server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/v1/chat/completions", exchange -> {
            received.set(json.readTree(exchange.getRequestBody()));
            byte[] body = json.writeValueAsBytes(java.util.Map.of("id", "grading", "object", "chat.completion", "created", 1,
                    "model", model, "choices", java.util.List.of(java.util.Map.of("index", 0, "finish_reason", "stop",
                    "message", java.util.Map.of("role", "assistant", "content", "{\"score_percent\":80}")))));
            exchange.getResponseHeaders().add("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, body.length);
            exchange.getResponseBody().write(body); exchange.close();
        });
        server.start();
        try {
            var dynamic = mock(DynamicAiConfigProvider.class);
            when(dynamic.resolveConfig("ASSESSMENT_GRADING")).thenReturn(new DynamicAiConfigProvider.ResolvedAiConfig(
                    "ASSESSMENT_GRADING", "OPENAI", model, "", "http://127.0.0.1:" + server.getAddress().getPort() + "/v1",
                    BigDecimal.valueOf(0.1), 8192, 120, null, null));
            var client = new AiInterviewClient(new AiInterviewAiConfig(), dynamic, RestClient.builder(), json);
            assertThat(client.evaluateAssessment("Review submitted code", json.createObjectNode().put("source", "test fixture"))
                    .path("score_percent").asInt()).isEqualTo(80);
            assertThat(received.get().path("model").asText()).isEqualTo(model);
            verify(dynamic).resolveConfig("ASSESSMENT_GRADING");
            verify(dynamic, never()).resolveConfig("INTERVIEW_NLP");
        } finally { server.stop(0); }
    }
}
