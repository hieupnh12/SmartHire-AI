package com.smarthire.tenant.cv.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.config.ai.DynamicAiConfigProvider;
import java.math.BigDecimal;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

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
    void missingDbConfigUsesHeuristicFallback() {
        var mapper = new ObjectMapper();
        var client = new GeminiCvAiClient(new HeuristicCvAiClient(mapper), mapper, 5);
        String json = client.extractJson("Jane Doe Java Spring Boot developer", "Title: Backend");
        assertThat(json).contains("Java").contains("Spring Boot");
        assertThat(client.modelVersion()).isEqualTo(HeuristicCvAiClient.MODEL);
    }

    @Test
    void exhaustedPrimaryCascadesToConfiguredFallbackModel() throws Exception {
        var mapper = new ObjectMapper();
        var models = new CopyOnWriteArrayList<String>();
        var server = com.sun.net.httpserver.HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/chat/completions", exchange -> {
            String model = mapper.readTree(exchange.getRequestBody()).path("model").asText();
            models.add(model);
            boolean primary = "primary-model".equals(model);
            byte[] body = (primary ? "{\"error\":{\"message\":\"quota exhausted\"}}"
                    : "{\"choices\":[{\"message\":{\"content\":\"{\\\"skills\\\":[{\\\"name\\\":\\\"Java\\\"}]}\"}}]}")
                    .getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(primary ? 429 : 200, body.length);
            try (var output = exchange.getResponseBody()) { output.write(body); }
        });
        server.start();
        try {
            String endpoint = "http://127.0.0.1:" + server.getAddress().getPort() + "/chat/completions";
            var provider = mock(DynamicAiConfigProvider.class);
            when(provider.resolveExecutionChain("CV_PARSING")).thenReturn(List.of(
                    new DynamicAiConfigProvider.ResolvedAiConfig("CV_PARSING", "OPENAI", "primary-model", "k1", endpoint,
                            BigDecimal.ZERO, 4096, 5, null, null),
                    new DynamicAiConfigProvider.ResolvedAiConfig("CV_PARSING", "OPENAI", "fallback-model", "k1", endpoint,
                            BigDecimal.ZERO, 4096, 5, null, null)));
            var client = new GeminiCvAiClient(new HeuristicCvAiClient(mapper), mapper, 5);
            client.setConfigProvider(provider);

            String json = client.completeJson("system", "CV text");

            assertThat(json).contains("Java");
            assertThat(models).containsExactly("primary-model", "fallback-model");
            verify(provider).markModelCooldown(eq("OPENAI"), eq("primary-model"), any());
            verify(provider, never()).markModelCooldown(anyString(), eq("fallback-model"), any());
        } finally {
            server.stop(0);
        }
    }
}
