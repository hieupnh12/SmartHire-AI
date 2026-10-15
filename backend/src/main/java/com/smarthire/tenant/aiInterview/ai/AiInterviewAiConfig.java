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
 * HTTP transport for AI Interview calls. Provider, model and API key come only from
 * Master DB (Admin &gt; AI Config) via {@link com.smarthire.config.ai.DynamicAiConfigProvider}.
 */
@Data
@Configuration
@ConfigurationProperties(prefix = "app.ai.interview")
public class AiInterviewAiConfig {

    private int timeoutSeconds = 10;

    @Bean
    @Qualifier("aiInterviewRestClientBuilder")
    public RestClient.Builder aiInterviewRestClientBuilder() {
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(5));
        factory.setReadTimeout(Duration.ofSeconds(Math.max(5, timeoutSeconds)));
        return RestClient.builder().requestFactory(factory);
    }
}
