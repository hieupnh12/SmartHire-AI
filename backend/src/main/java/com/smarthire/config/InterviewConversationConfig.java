package com.smarthire.config;

import java.time.Duration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.web.client.RestClient;

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
    public RestClient.Builder interviewConversationHttp() {
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(5)); factory.setReadTimeout(Duration.ofSeconds(45));
        return RestClient.builder().requestFactory(factory);
    }
}
