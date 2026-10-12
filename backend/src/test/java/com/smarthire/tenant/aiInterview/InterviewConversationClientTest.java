package com.smarthire.tenant.aiInterview;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.config.ai.DynamicAiConfigProvider;
import com.smarthire.tenant.aiInterview.ai.*;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
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
    @BeforeEach void setup() {
        var builder = RestClient.builder(); server = MockRestServiceServer.bindTo(builder).build();
        client = new InterviewConversationClient(configs, new AiInterviewAiConfig(), mapper, builder,
                "https://generativelanguage.googleapis.com/v1beta", "gemini-2.5-flash-preview-tts", "");
        lenient().when(configs.resolveConfig(anyString())).thenAnswer(invocation -> new DynamicAiConfigProvider.ResolvedAiConfig(
                invocation.getArgument(0), "GEMINI", "gemini-2.5-flash", "test-key", null, BigDecimal.ZERO, 4096, 45, null, null));
    }
    String url(String operation) { return "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:" + operation; }
    @Test void streamsRealProviderChunksAndPreservesChatRoles() {
        String events = "data: {\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"Hello \"}]}}]}\n\n"
                + "data: {\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"candidate\"}]},\"finishReason\":\"STOP\"}]}\n\n";
        server.expect(requestTo(url("streamGenerateContent") + "?alt=sse"))
                .andExpect(header("x-goog-api-key", "test-key"))
                .andExpect(jsonPath("$.contents[1].role").value("model"))
                .andExpect(jsonPath("$.contents[2].role").value("user"))
                .andRespond(withSuccess(events, MediaType.TEXT_EVENT_STREAM));
        var chunks = new ArrayList<String>();
        assertThat(client.dialogue("Interview", List.of(new InterviewConversationClient.Message("USER", "context"),
                new InterviewConversationClient.Message("ASSISTANT", "question"), new InterviewConversationClient.Message("USER", "answer")), chunks::add))
                .isEqualTo("Hello candidate");
        assertThat(chunks).containsExactly("Hello ", "candidate"); server.verify();
    }
    @Test void incompleteStreamDoesNotBecomeACommittedReply() {
        server.expect(requestTo(url("streamGenerateContent") + "?alt=sse"))
                .andRespond(withSuccess("data: {\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"partial\"}]},\"finishReason\":\"MAX_TOKENS\"}]}\n\n", MediaType.TEXT_EVENT_STREAM));
        assertThatThrownBy(() -> client.dialogue("Interview", List.of(new InterviewConversationClient.Message("USER", "answer")), text -> {}))
                .isInstanceOf(IllegalStateException.class); server.verify();
    }
    @Test void quotaErrorExposesStatusWithoutResponseBody() {
        server.expect(requestTo(url("streamGenerateContent") + "?alt=sse"))
                .andRespond(withStatus(HttpStatus.TOO_MANY_REQUESTS).body("test-key private candidate answer"));
        assertThatThrownBy(() -> client.dialogue("Interview", List.of(new InterviewConversationClient.Message("USER", "answer")), text -> {}))
                .isInstanceOf(AiInterviewClient.ProviderException.class).hasMessageContaining("429").hasMessageNotContaining("test-key");
        server.verify();
    }
    @Test void evaluationUsesNlpTaskAndJsonOutput() {
        server.expect(requestTo(url("generateContent"))).andExpect(jsonPath("$.generationConfig.responseMimeType").value("application/json"))
                .andRespond(withSuccess("{\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"{\\\"criteria\\\":{}}\"}]},\"finishReason\":\"STOP\"}]}", MediaType.APPLICATION_JSON));
        assertThat(client.evaluate("Evaluate transcript", mapper.createObjectNode()).has("criteria")).isTrue();
        verify(configs).resolveConfig("INTERVIEW_NLP"); server.verify();
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
        assertThat(client.speech("Hello")).containsExactly(wave.array()); server.verify();
    }

    @Test void sttSendsAudioToBackendProviderAndTtsReturnsPlayableWave() {
        server.expect(requestTo(url("generateContent")))
                .andExpect(jsonPath("$.contents[0].parts[1].inlineData.mimeType").value("audio/webm"))
                .andRespond(withSuccess("{\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"I use dependency injection\"}]},\"finishReason\":\"STOP\"}]}", MediaType.APPLICATION_JSON));
        server.expect(requestTo("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent"))
                .andRespond(withSuccess("{\"candidates\":[{\"content\":{\"parts\":[{\"inlineData\":{\"mimeType\":\"audio/L16;codec=pcm;rate=24000\",\"data\":\"AAAAAA==\"}}]},\"finishReason\":\"STOP\"}]}", MediaType.APPLICATION_JSON));
        assertThat(client.transcribe(new byte[]{1, 2}, "audio/webm", "English")).isEqualTo("I use dependency injection");
        byte[] wave = client.speech("Hello"); assertThat(wave).hasSize(48);
        assertThat(new String(wave, 0, 4, java.nio.charset.StandardCharsets.US_ASCII)).isEqualTo("RIFF"); server.verify();
    }
}
