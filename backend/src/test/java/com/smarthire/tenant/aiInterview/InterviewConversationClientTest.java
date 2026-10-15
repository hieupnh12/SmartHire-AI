package com.smarthire.tenant.aiInterview;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.config.ai.DynamicAiConfigProvider;
import com.smarthire.tenant.aiInterview.ai.*;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.AfterEach;
import org.springframework.web.reactive.function.client.WebClient;
import org.junit.jupiter.api.Test;
import org.springframework.http.*;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class InterviewConversationClientTest {
    DynamicAiConfigProvider configs = mock(DynamicAiConfigProvider.class);
    ObjectMapper mapper = new ObjectMapper(); MockRestServiceServer server; InterviewConversationClient client;
    com.sun.net.httpserver.HttpServer provider;
    volatile String events; volatile int status; volatile com.fasterxml.jackson.databind.JsonNode sent;
    volatile String authorization; String chatUrl;
    java.util.concurrent.atomic.AtomicInteger requests = new java.util.concurrent.atomic.AtomicInteger();
    volatile int transientFailures;
    @BeforeEach void setup() throws Exception {
        status = 200;
        provider = com.sun.net.httpserver.HttpServer.create(new java.net.InetSocketAddress("127.0.0.1", 0), 0);
        provider.createContext("/chat/completions", exchange -> {
            authorization = exchange.getRequestHeaders().getFirst("Authorization");
            sent = mapper.readTree(exchange.getRequestBody());
            boolean unavailable = requests.incrementAndGet() <= transientFailures;
            byte[] body = (unavailable ? "{\"error\":{\"status\":\"UNAVAILABLE\",\"message\":\"The model is overloaded\"}}" : events)
                    .getBytes(java.nio.charset.StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", unavailable || status != 200 ? "application/json" : "text/event-stream");
            exchange.sendResponseHeaders(unavailable ? 503 : status, body.length);
            try (var output = exchange.getResponseBody()) { output.write(body); }
        });
        provider.start();
        base = "http://127.0.0.1:" + provider.getAddress().getPort();
        chatUrl = base + "/chat/completions";
        var builder = RestClient.builder(); server = MockRestServiceServer.bindTo(builder).build();
        client = newClient(builder, new com.smarthire.config.InterviewConversationConfig().interviewConversationWebClient(10), 60);
        lenient().when(configs.resolveConfig(anyString())).thenAnswer(invocation -> config(invocation.getArgument(0),
                "GEMINI", "gemini-2.5-flash", "test-key", base));
    }
    String base;
    InterviewConversationClient newClient(RestClient.Builder builder, WebClient.Builder web, int timeout) {
        return new InterviewConversationClient(configs, mapper, builder, "https://generativelanguage.googleapis.com/v1beta", web, timeout);
    }
    DynamicAiConfigProvider.ResolvedAiConfig config(String task, String provider, String model, String key, String endpoint) {
        if (task.equals("INTERVIEW_STT")) return new DynamicAiConfigProvider.ResolvedAiConfig(
                task, "GEMINI", "gemini-2.5-flash", "speech-key", null, BigDecimal.ZERO, 4096, 45, null, null);
        if (task.equals("INTERVIEW_TTS")) return new DynamicAiConfigProvider.ResolvedAiConfig(
                task, "GEMINI", "gemini-2.5-flash-preview-tts", "speech-key", null, BigDecimal.ZERO, 4096, 45, null, null);
        return new DynamicAiConfigProvider.ResolvedAiConfig(task, provider, model, key, endpoint, BigDecimal.ZERO, 4096, 45, null, null);
    }
    @AfterEach void stopProvider() { provider.stop(0); com.smarthire.multitenancy.context.TenantContext.clear(); }
    String url(String operation) { return "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:" + operation; }
    @Test void connectionFailuresReturnRetryableErrorsWithoutSensitiveDetails() {
        var failures = List.of(new java.net.SocketTimeoutException("test-key private answer"),
                new java.net.UnknownHostException("private-host"),
                new javax.net.ssl.SSLHandshakeException("private certificate"));
        for (var failure : failures) {
            var web = WebClient.builder().exchangeFunction(request -> reactor.core.publisher.Mono.error(
                    new org.springframework.web.reactive.function.client.WebClientRequestException(failure,
                            HttpMethod.POST, request.url(), request.headers())));
            client = newClient(RestClient.builder(), web, 60);
            assertThatThrownBy(() -> client.dialogue("Interview",
                    List.of(new InterviewConversationClient.Message("USER", "context")), text -> {}))
                    .isInstanceOfSatisfying(com.smarthire.common.exception.BusinessException.class, ex -> {
                        assertThat(ex.getStatus()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
                        assertThat(ex.getCode()).isEqualTo(failure instanceof java.net.SocketTimeoutException
                                ? "AI_INTERVIEW_PROVIDER_TIMEOUT" : "AI_INTERVIEW_PROVIDER_UNAVAILABLE");
                        assertThat(ex.getMessage()).doesNotContain("test-key", "private");
                        assertThat(ex.getCause()).isNull();
                        var response = new com.smarthire.common.exception.GlobalExceptionHandler().handleBusiness(ex);
                        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
                    });
            server.verify();
        }
    }
    String chunk(String text, String finish) {
        var root = mapper.createObjectNode().put("id", "chat-1").put("object", "chat.completion.chunk")
                .put("created", 1).put("model", "gemini-2.5-flash");
        var choice = root.putArray("choices").addObject().put("index", 0);
        choice.putObject("delta").put("role", "assistant").put("content", text);
        if (finish != null) choice.put("finish_reason", finish);
        return "data: " + root + "\n\n";
    }
    void useLlama() {
        when(configs.resolveConfig(anyString())).thenAnswer(invocation -> config(invocation.getArgument(0),
                "OPENAI", "vanilj/llama-3-8b-instruct-32k-v0.1:Q4_K_M", "llama-key", chatUrl + "/"));
    }
    @Test void llamaStreamsFromFullEndpointWithDbModel() {
        useLlama();
        events = chunk("Hello candidate", "stop") + "data: [DONE]\n\n";
        assertThat(client.dialogue("Interview", List.of(new InterviewConversationClient.Message("USER", "Hello")), text -> {}))
                .isEqualTo("Hello candidate");
        assertThat(authorization).isEqualTo("Bearer llama-key");
        assertThat(sent.path("model").asText()).isEqualTo("vanilj/llama-3-8b-instruct-32k-v0.1:Q4_K_M");
        assertThat(sent.has("reasoning_effort")).isFalse();
    }
    @Test void customProviderStreamsFromItsEndpoint() {
        when(configs.resolveConfig(anyString())).thenAnswer(invocation -> config(invocation.getArgument(0),
                "CUSTOM", "vanilj/llama-3-8b-instruct-32k-v0.1:Q4_K_M", "litellm-key", base + "/v1/"));
        provider.createContext("/v1/chat/completions", exchange -> {
            authorization = exchange.getRequestHeaders().getFirst("Authorization");
            byte[] body = (chunk("Hi", "stop") + "data: [DONE]\n\n").getBytes(java.nio.charset.StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "text/event-stream");
            exchange.sendResponseHeaders(200, body.length);
            try (var output = exchange.getResponseBody()) { output.write(body); }
        });
        assertThat(client.dialogue("Interview", List.of(new InterviewConversationClient.Message("USER", "Hello")), text -> {}))
                .isEqualTo("Hi");
        assertThat(authorization).isEqualTo("Bearer litellm-key");
    }
    @Test void llamaEvaluationUsesNlpTaskAndFullEndpoint() {
        useLlama();
        events = chunk("{", null) + chunk("}", "stop") + "data: [DONE]\n\n";
        assertThat(client.evaluate("Evaluate synthetic transcript", mapper.createObjectNode()).isObject()).isTrue();
        assertThat(authorization).isEqualTo("Bearer llama-key");
        assertThat(sent.path("model").asText()).isEqualTo("vanilj/llama-3-8b-instruct-32k-v0.1:Q4_K_M");
        assertThat(sent.path("response_format").path("type").asText()).isEqualTo("json_schema");
        assertThat(sent.at("/response_format/json_schema/schema/properties/criteria/required").size()).isEqualTo(4);
        assertThat(sent.path("max_tokens").asInt()).isEqualTo(4096);
        verify(configs).resolveConfig("INTERVIEW_NLP"); server.verify();
    }

    @Test void llamaSpeechUsesSeparateGeminiCredentials() {
        useLlama();
        server.expect(requestTo(url("generateContent"))).andExpect(header("x-goog-api-key", "speech-key"))
                .andRespond(withSuccess("{\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"Synthetic speech\"}]},\"finishReason\":\"STOP\"}]}", MediaType.APPLICATION_JSON));
        assertThat(client.transcribe(new byte[]{1}, "audio/webm", "English")).isEqualTo("Synthetic speech");
        verify(configs).resolveConfig("INTERVIEW_STT");
        verify(configs, never()).resolveConfig("INTERVIEW_GEN");
        server.verify(); assertThat(requests.get()).isZero();
    }
    @Test void nativeSpeechRetriesTransientOverloadOnce() {
        server.expect(requestTo(url("generateContent"))).andRespond(withStatus(HttpStatus.SERVICE_UNAVAILABLE));
        server.expect(requestTo(url("generateContent"))).andExpect(header("x-goog-api-key", "speech-key"))
                .andRespond(withSuccess("{\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"Recovered speech\"}]},\"finishReason\":\"STOP\"}]}", MediaType.APPLICATION_JSON));
        assertThat(client.transcribe(new byte[]{1}, "audio/webm", "English")).isEqualTo("Recovered speech");
        server.verify();
    }
    @Test void streamsRealProviderChunksAndPreservesChatRoles() {
        var limiter = mock(com.smarthire.config.ai.AiRateLimiterService.class);
        var meter = mock(com.smarthire.config.ai.AiUsageMeteringService.class);
        client.setRateLimiterService(limiter); client.setMeteringService(meter);
        events = chunk("Hello ", null) + chunk("candidate", "stop") + "data: [DONE]\n\n";
        var chunks = new ArrayList<String>();
        assertThat(client.dialogue("Interview", List.of(new InterviewConversationClient.Message("USER", "context"),
                new InterviewConversationClient.Message("ASSISTANT", "question"), new InterviewConversationClient.Message("USER", "answer")), chunks::add))
                .isEqualTo("Hello candidate");
        assertThat(chunks).containsExactly("Hello ", "candidate");
        assertThat(authorization).isEqualTo("Bearer test-key");
        assertThat(sent.path("stream").asBoolean()).isTrue();
        assertThat(sent.path("model").asText()).isEqualTo("gemini-2.5-flash");
        assertThat(sent.path("reasoning_effort").asText()).isEqualTo("none");
        assertThat(sent.path("messages").path(0).path("role").asText()).isEqualTo("system");
        assertThat(sent.path("messages").path(2).path("role").asText()).isEqualTo("assistant");
        assertThat(sent.path("messages").path(3).path("role").asText()).isEqualTo("user");
        verify(limiter).checkAndAcquire("INTERVIEW_GEN");
        verify(meter).recordUsageAsync(eq("INTERVIEW_GEN"), eq("GEMINI"), eq("gemini-2.5-flash"),
                anyLong(), anyLong(), anyLong(), eq(true));
    }
    @Test void streamEndingWithoutStopNeverBecomesAReply() {
        events = chunk("partial", null) + "data: [DONE]\n\n";
        assertThatThrownBy(() -> client.dialogue("Interview",
                List.of(new InterviewConversationClient.Message("USER", "answer")), text -> {}))
                .isInstanceOf(IllegalStateException.class);
    }
    @Test void finishReasonStopCompletesReplyEvenWhenProviderKeepsConnectionOpen() {
        var buffer = new org.springframework.core.io.buffer.DefaultDataBufferFactory()
                .wrap(chunk("Hello candidate", "stop").getBytes(java.nio.charset.StandardCharsets.UTF_8));
        var web = WebClient.builder().exchangeFunction(request -> reactor.core.publisher.Mono.just(
                org.springframework.web.reactive.function.client.ClientResponse.create(HttpStatus.OK)
                        .header("Content-Type", "text/event-stream")
                        .body(reactor.core.publisher.Flux.concat(reactor.core.publisher.Flux.just(buffer),
                                reactor.core.publisher.Flux.never())).build()));
        client = newClient(RestClient.builder(), web, 1);
        assertThat(client.dialogue("Interview", List.of(new InterviewConversationClient.Message("USER", "context")), text -> {}))
                .isEqualTo("Hello candidate");
    }
    @Test void stalledStreamReturnsTimeoutInsteadOfHanging() {
        var web = WebClient.builder().exchangeFunction(request -> reactor.core.publisher.Mono.never());
        client = newClient(RestClient.builder(), web, 1);
        assertThatThrownBy(() -> client.dialogue("Interview",
                List.of(new InterviewConversationClient.Message("USER", "context")), text -> {}))
                .isInstanceOfSatisfying(com.smarthire.common.exception.BusinessException.class,
                        ex -> assertThat(ex.getCode()).isEqualTo("AI_INTERVIEW_PROVIDER_TIMEOUT"));
    }
    @Test void incompleteStreamDoesNotBecomeACommittedReply() {
        events = chunk("partial", "length") + "data: [DONE]\n\n";
        assertThatThrownBy(() -> client.dialogue("Interview", List.of(new InterviewConversationClient.Message("USER", "answer")), text -> {}))
                .isInstanceOf(IllegalStateException.class); server.verify();
    }
    @Test void quotaErrorExposesStatusWithoutResponseBody() {
        status = 429; events = "test-key private candidate answer";
        assertThatThrownBy(() -> client.dialogue("Interview", List.of(new InterviewConversationClient.Message("USER", "answer")), text -> {}))
                .isInstanceOfSatisfying(com.smarthire.common.exception.BusinessException.class, ex -> {
                    assertThat(ex.getStatus()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
                    assertThat(ex.getCode()).isEqualTo("AI_INTERVIEW_PROVIDER_RATE_LIMITED");
                    assertThat(ex.getMessage()).doesNotContain("test-key", "private");
                });
        server.verify();
        assertThat(requests.get()).isEqualTo(1);
    }
    @Test void transientOverloadRetriesOnceBeforeStreamingWithoutDuplicatingReply() {
        com.smarthire.multitenancy.context.TenantContext.setCurrentTenant("se36");
        transientFailures = 1;
        events = chunk("Hello candidate", "stop") + "data: [DONE]\n\n";
        var limiter = mock(com.smarthire.config.ai.AiRateLimiterService.class);
        client.setRateLimiterService(limiter);
        var chunks = new ArrayList<String>();
        assertThat(client.dialogue("Interview", List.of(new InterviewConversationClient.Message("USER", "context")), chunks::add))
                .isEqualTo("Hello candidate");
        assertThat(chunks).containsExactly("Hello candidate"); assertThat(requests.get()).isEqualTo(2);
        verify(limiter).checkAndAcquire("INTERVIEW_GEN");
        verify(limiter).checkAndAcquire("se36", "INTERVIEW_GEN");
    }
    @Test void persistentOverloadIsBoundedAndNeverExposesProviderBody() {
        status = 503; events = "{\"error\":{\"status\":\"UNAVAILABLE\",\"message\":\"The model is overloaded: test-key private candidate answer\"}}";
        assertThatThrownBy(() -> client.dialogue("Interview",
                List.of(new InterviewConversationClient.Message("USER", "context")), text -> {}))
                .isInstanceOfSatisfying(com.smarthire.common.exception.BusinessException.class, ex -> {
                    assertThat(ex.getCode()).isEqualTo("AI_INTERVIEW_PROVIDER_OVERLOADED");
                    assertThat(ex.getMessage()).doesNotContain("test-key", "private", "candidate answer");
                    assertThat(ex.getCause()).isNull();
                });
        assertThat(requests.get()).isEqualTo(2);
    }
    @Test void providerHttpErrorsReturnSpecificCodesInsteadOfInternalError() {
        for (int providerStatus : new int[]{401, 403, 404, 503}) {
            status = providerStatus; events = "test-key private candidate answer";
            assertThatThrownBy(() -> client.dialogue("Interview",
                    List.of(new InterviewConversationClient.Message("USER", "context")), text -> {}))
                    .isInstanceOfSatisfying(com.smarthire.common.exception.BusinessException.class, ex -> {
                        assertThat(ex.getStatus()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
                        assertThat(ex.getCode()).isEqualTo(providerStatus == 404 ? "AI_INTERVIEW_PROVIDER_MODEL_NOT_FOUND"
                                : providerStatus == 503 ? "AI_INTERVIEW_PROVIDER_UNAVAILABLE" : "AI_INTERVIEW_PROVIDER_AUTH_FAILED");
                        assertThat(ex.getMessage()).doesNotContain("test-key", "private");
                        assertThat(new com.smarthire.common.exception.GlobalExceptionHandler()
                                .handleBusiness(ex).getStatusCode()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
                    });
        }
    }
    @Test void evaluationUsesNlpTaskAndJsonOutput() {
        events = chunk("{\"criteria\":", null) + chunk("{}}", "stop") + "data: [DONE]\n\n";
        assertThat(client.evaluate("Evaluate transcript", mapper.createObjectNode()).has("criteria")).isTrue();
        assertThat(sent.path("response_format").path("type").asText()).isEqualTo("json_object");
        assertThat(sent.path("messages").path(0).path("role").asText()).isEqualTo("system");
        verify(configs).resolveConfig("INTERVIEW_NLP"); server.verify();
    }
    @Test void evaluationRejectsPartialOrMalformedReport() {
        events = chunk("{}", "length") + "data: [DONE]\n\n";
        assertThatThrownBy(() -> client.evaluate("Evaluate", mapper.createObjectNode())).isInstanceOf(IllegalStateException.class);
        events = chunk("private invalid report", "stop") + "data: [DONE]\n\n";
        assertThatThrownBy(() -> client.evaluate("Evaluate", mapper.createObjectNode()))
                .isInstanceOf(IllegalStateException.class).hasMessageNotContaining("private");
    }

    @Test void sttUsesSttTaskModelEvenWhenChatIsLlama() {
        useLlama();
        server.expect(requestTo(url("generateContent")))
                .andExpect(header("x-goog-api-key", "speech-key"))
                .andExpect(jsonPath("$.systemInstruction.parts[0].text").value(org.hamcrest.Matchers.containsString("in Vietnamese")))
                .andExpect(jsonPath("$.contents[0].parts[1].inlineData.mimeType").value("audio/webm"))
                .andExpect(jsonPath("$.generationConfig.thinkingConfig.thinkingBudget").value(0))
                .andRespond(withSuccess("{\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"Tôi sử dụng Java\"}]},\"finishReason\":\"STOP\"}]}", MediaType.APPLICATION_JSON));
        assertThat(client.transcribe(new byte[]{1, 2}, "audio/webm", "Vietnamese")).isEqualTo("Tôi sử dụng Java");
        server.verify();
    }
    @Test void ttsAcceptsNativeWaveWithoutWrappingItAsPcmAgain() {
        var wave = java.nio.ByteBuffer.allocate(46).order(java.nio.ByteOrder.LITTLE_ENDIAN);
        wave.put("RIFF".getBytes(java.nio.charset.StandardCharsets.US_ASCII)).putInt(38)
                .put("WAVEfmt ".getBytes(java.nio.charset.StandardCharsets.US_ASCII)).putInt(16).putShort((short) 1).putShort((short) 1)
                .putInt(24000).putInt(48000).putShort((short) 2).putShort((short) 16)
                .put("data".getBytes(java.nio.charset.StandardCharsets.US_ASCII)).putInt(2).putShort((short) 0);
        String data = java.util.Base64.getEncoder().encodeToString(wave.array());
        server.expect(requestTo("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent"))
                .andRespond(withSuccess("{\"candidates\":[{\"content\":{\"parts\":[{\"inlineData\":{\"mimeType\":\"audio/wav\",\"data\":\"" + data + "\"}}]},\"finishReason\":\"STOP\"}]}", MediaType.APPLICATION_JSON));
        assertThat(client.speech("Hello", "English")).containsExactly(wave.array()); server.verify();
    }

    @Test void sttSendsAudioToBackendProviderAndTtsReturnsPlayableWave() {
        server.expect(requestTo(url("generateContent")))
                .andExpect(jsonPath("$.contents[0].parts[1].inlineData.mimeType").value("audio/webm"))
                .andRespond(withSuccess("{\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"I use dependency injection\"}]},\"finishReason\":\"STOP\"}]}", MediaType.APPLICATION_JSON));
        server.expect(requestTo("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent"))
                .andExpect(jsonPath("$.contents[0].parts[0].text").value("Read the following interview message naturally and verbatim in Vietnamese. Do not translate it:\nChào bạn"))
                .andRespond(withSuccess("{\"candidates\":[{\"content\":{\"parts\":[{\"inlineData\":{\"mimeType\":\"audio/L16;codec=pcm;rate=24000\",\"data\":\"AAAAAA==\"}}]},\"finishReason\":\"STOP\"}]}", MediaType.APPLICATION_JSON));
        assertThat(client.transcribe(new byte[]{1, 2}, "audio/webm", "English")).isEqualTo("I use dependency injection");
        byte[] wave = client.speech("Chào bạn", "Vietnamese"); assertThat(wave).hasSize(48);
        assertThat(new String(wave, 0, 4, java.nio.charset.StandardCharsets.US_ASCII)).isEqualTo("RIFF"); server.verify();
    }

    @Test void dialogueFailsOverToSecondaryModelWhenPrimaryRateLimited() {
        when(configs.resolveConfig("INTERVIEW_GEN")).thenReturn(new DynamicAiConfigProvider.ResolvedAiConfig(
                "INTERVIEW_GEN", "GEMINI", "gemini-3.8-flash", "test-key", base, BigDecimal.ZERO, 4096, 45, "GEMINI", "gemini-3.5-flash-lite"));

        var models = new java.util.concurrent.CopyOnWriteArrayList<String>();
        provider.removeContext("/chat/completions");
        provider.createContext("/chat/completions", exchange -> {
            String model = mapper.readTree(exchange.getRequestBody()).path("model").asText();
            models.add(model);
            boolean primary = "gemini-3.8-flash".equals(model);
            byte[] body = (primary ? "{\"error\":{\"status\":\"RESOURCE_EXHAUSTED\",\"message\":\"quota exceeded\"}}"
                    : chunk("Fallback response", "stop") + "data: [DONE]\n\n").getBytes(java.nio.charset.StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", primary ? "application/json" : "text/event-stream");
            exchange.sendResponseHeaders(primary ? 429 : 200, body.length);
            try (var output = exchange.getResponseBody()) { output.write(body); }
        });

        var chunks = new ArrayList<String>();
        String reply = client.dialogue("Interview", List.of(new InterviewConversationClient.Message("USER", "Hello")), chunks::add);
        assertThat(reply).isEqualTo("Fallback response");
        assertThat(chunks).containsExactly("Fallback response");
        assertThat(models).containsExactly("gemini-3.8-flash", "gemini-3.5-flash-lite");
    }

    @Test void missingDbTasksAreReportedAsNotConfigured() {
        when(configs.resolveConfig(anyString())).thenAnswer(invocation -> new DynamicAiConfigProvider.ResolvedAiConfig(
                invocation.getArgument(0), null, null, "", null, BigDecimal.ZERO, 2048, 30, null, null));
        assertThatThrownBy(() -> client.dialogue("Interview",
                List.of(new InterviewConversationClient.Message("USER", "context")), text -> {}))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("not configured");
        assertThatThrownBy(() -> client.speech("Hello", "English"))
                .isInstanceOfSatisfying(com.smarthire.common.exception.BusinessException.class,
                        ex -> assertThat(ex.getCode()).isEqualTo("AI_INTERVIEW_SPEECH_UNAVAILABLE"));
        assertThat(requests.get()).isZero(); server.verify();
    }
}
