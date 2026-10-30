package com.smarthire.config;

import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.web.client.RestClient;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.http.client.reactive.JdkClientHttpConnector;
import java.net.http.HttpClient;

@Configuration
public class InterviewConversationConfig {
    @Bean("interviewConversationExecutor")
    public ThreadPoolTaskExecutor interviewConversationExecutor() {
        var executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(3); executor.setMaxPoolSize(10); executor.setQueueCapacity(30);
        executor.setThreadNamePrefix("interview-dialogue-");
        return executor;
    }
    @Bean("interviewConversationHttp")
    public RestClient.Builder interviewConversationHttp(
            @Value("${AI_INTERVIEW_CONVERSATION_CONNECT_TIMEOUT_SECONDS:10}") int connectTimeoutSeconds,
            @Value("${AI_INTERVIEW_CONVERSATION_TIMEOUT_SECONDS:240}") int readTimeoutSeconds) {
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(Math.max(1, connectTimeoutSeconds)));
        factory.setReadTimeout(Duration.ofSeconds(Math.max(1, readTimeoutSeconds)));
        return RestClient.builder().requestFactory(factory);
    }

    @Bean("interviewConversationWebClient")
    public WebClient.Builder interviewConversationWebClient(
            @Value("${AI_INTERVIEW_CONVERSATION_CONNECT_TIMEOUT_SECONDS:10}") int connectTimeoutSeconds) {
        var client = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(Math.max(1, connectTimeoutSeconds))).build();
        return WebClient.builder().clientConnector(new JdkClientHttpConnector(client));
    }
}
