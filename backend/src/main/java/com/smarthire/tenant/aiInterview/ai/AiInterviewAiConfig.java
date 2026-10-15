package com.smarthire.tenant.aiInterview.ai;

import java.time.Duration;
import lombok.Data;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

/**
 * Dedicated OpenAI-compatible API configuration for AI Interview flows
 * (question generation, NLP analysis, scoring) — separate from CV parsing keys.
 */
@Data
@Configuration
@ConfigurationProperties(prefix = "app.ai.interview")
public class AiInterviewAiConfig {

    private static final String DEFAULT_INTERVIEW_BASE =
            "https://linked-flagpole-many.ngrok-free.dev/v1/chat/completions";

    /** API key used only by AI Interview. */
    private String apiKey = "";

    private String model = "vanilj/llama-3-8b-instruct-32k-v0.1:Q4_K_M";

    private String baseUrl = DEFAULT_INTERVIEW_BASE;

    private int timeoutSeconds = 10;

    public boolean isConfigured() {
        return apiKey != null && !apiKey.isBlank();
    }

    @Bean
    @Qualifier("aiInterviewRestClientBuilder")
    public RestClient.Builder aiInterviewRestClientBuilder() {
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(5));
        factory.setReadTimeout(Duration.ofSeconds(Math.max(5, timeoutSeconds)));
        return RestClient.builder().requestFactory(factory);
    }
}
