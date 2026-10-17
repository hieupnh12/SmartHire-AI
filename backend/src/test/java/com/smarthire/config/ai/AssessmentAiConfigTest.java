package com.smarthire.config.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.common.redis.RedisService;
import com.smarthire.domain.master.repository.AiModelConfigRepository;
import com.smarthire.domain.master.repository.AiProviderKeyRepository;
import com.smarthire.multitenancy.service.TenantCredentialService;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class AssessmentAiConfigTest {
    @Test void assessmentUsesRequestedLlamaAndExistingInterviewConnection() {
        var redis = mock(RedisService.class);
        var models = mock(AiModelConfigRepository.class);
        when(redis.get(anyString())).thenReturn(Optional.empty());
        when(models.findByTaskType(anyString())).thenReturn(Optional.empty());
        var provider = new DynamicAiConfigProvider(models, mock(AiProviderKeyRepository.class),
                mock(TenantCredentialService.class), redis, new ObjectMapper(), "gemini-key", "cv-model", 30,
                "llama-key", "different-interview-model", 60);
        ReflectionTestUtils.setField(provider, "interviewEndpoint", "http://localhost:1234/v1");
        var config = provider.resolveConfig("ASSESSMENT_GEN");
        assertThat(config.taskType()).isEqualTo("ASSESSMENT_GEN");
        assertThat(config.provider()).isEqualTo("OPENAI");
        assertThat(config.modelName()).isEqualTo("vanilj/llama-3-8b-instruct-32k-v0.1:Q4_K_M");
        assertThat(config.endpointUrl()).isEqualTo("http://localhost:1234/v1");
        assertThat(config.apiKey()).isEqualTo("llama-key");
        assertThat(config.failoverProvider()).isNull();
        var grading = provider.resolveConfig("ASSESSMENT_GRADING");
        assertThat(grading.modelName()).isEqualTo(config.modelName());
        assertThat(grading.provider()).isEqualTo("OPENAI");
        assertThat(grading.endpointUrl()).isEqualTo(config.endpointUrl());
        assertThat(grading.apiKey()).isEqualTo(config.apiKey());
        assertThat(grading.temperature()).isEqualByComparingTo("0.10");
        assertThat(grading.failoverProvider()).isNull();
        ReflectionTestUtils.setField(provider, "assessmentEndpoint", "http://localhost:4321/v1");
        ReflectionTestUtils.setField(provider, "assessmentKey", "assessment-key");
        assertThat(provider.resolveConfig("ASSESSMENT_GEN").endpointUrl()).isEqualTo("http://localhost:4321/v1");
        assertThat(provider.resolveConfig("ASSESSMENT_GEN").apiKey()).isEqualTo("assessment-key");
        assertThat(provider.resolveConfig("ASSESSMENT_GRADING").endpointUrl()).isEqualTo("http://localhost:4321/v1");
        assertThat(provider.resolveConfig("ASSESSMENT_GRADING").apiKey()).isEqualTo("assessment-key");
    }
}
