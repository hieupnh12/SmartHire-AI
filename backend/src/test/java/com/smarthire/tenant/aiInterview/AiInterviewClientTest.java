package com.smarthire.tenant.aiInterview;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.tenant.aiInterview.ai.AiInterviewAiConfig;
import com.smarthire.tenant.aiInterview.ai.AiInterviewClient;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class AiInterviewClientTest {
    @Test
    void providerFailureExposesSafeStatusWithoutResponseBodyOrCredential() {
        var config = new AiInterviewAiConfig();
        config.setApiKey("test-secret");
        var builder = RestClient.builder();
        var server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo(config.generateContentUrl().split("\\?", 2)[0]))
                .andExpect(header("x-goog-api-key", "test-secret"))
                .andRespond(withStatus(HttpStatus.SERVICE_UNAVAILABLE)
                        .body("sensitive candidate data test-secret").contentType(MediaType.TEXT_PLAIN));
        var mapper = new ObjectMapper();
        var client = new AiInterviewClient(config, builder.build(), mapper);

        var error = assertThrows(AiInterviewClient.ProviderException.class,
                () -> client.generate("Generate questions", mapper.createObjectNode()));

        assertTrue(error.getMessage().contains("503"));
        assertFalse(error.getMessage().contains("test-secret"));
        assertFalse(error.getMessage().contains("candidate data"));
        assertNull(error.getCause());
        server.verify();
    }
}
