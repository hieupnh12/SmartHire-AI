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
 * Dedicated Gemini API configuration for AI Interview flows
 * (question generation, NLP analysis, scoring) — separate from CV parsing keys.
 */
@Data
@Configuration
@ConfigurationProperties(prefix = "app.ai.interview")
public class AiInterviewAiConfig {

    private static final String DEFAULT_GEMINI_BASE =
            "https://generativelanguage.googleapis.com/v1beta/openai";

    /** Gemini API key used only by AI Interview. */
    private String apiKey = "";

    private String model = "gemini-2.5-flash";

    private String baseUrl = DEFAULT_GEMINI_BASE;

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
