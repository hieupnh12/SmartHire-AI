package com.smarthire.tenant.aiInterview;

import com.smarthire.config.ai.DynamicAiConfigProvider;
import com.smarthire.messaging.AiInterviewWorkDispatcher;
import com.smarthire.tenant.aiInterview.ai.AiInterviewAiConfig;
import com.smarthire.tenant.aiInterview.ai.AiInterviewClient;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

class AiInterviewContextTest {
    @Test void nativeConversationClientHasDedicatedHttpAndExecutorBeans() {
        new ApplicationContextRunner()
                .withUserConfiguration(com.smarthire.config.InterviewConversationConfig.class,
                        AiInterviewAiConfig.class, com.smarthire.tenant.aiInterview.ai.InterviewConversationClient.class)
                .withBean(ObjectMapper.class, ObjectMapper::new)
                .withBean(DynamicAiConfigProvider.class, () -> mock(DynamicAiConfigProvider.class))
                .run(context -> assertThat(context).hasNotFailed()
                        .hasSingleBean(com.smarthire.tenant.aiInterview.ai.InterviewConversationClient.class)
                        .hasBean("interviewConversationExecutor"));
    }
    @Test
    void createsInterviewClientWithRuntimeDependenciesAndNoProviderKey() {
        new ApplicationContextRunner()
                .withUserConfiguration(AiInterviewAiConfig.class, AiInterviewClient.class)
                .withBean(ObjectMapper.class, ObjectMapper::new)
                .withBean(DynamicAiConfigProvider.class, () -> mock(DynamicAiConfigProvider.class))
                .run(context -> {
                    assertThat(context).hasNotFailed().hasSingleBean(AiInterviewClient.class);
                    assertThat(AiInterviewWorkDispatcher.class.getDeclaredConstructors()).hasSize(1);
                });
    }
}
