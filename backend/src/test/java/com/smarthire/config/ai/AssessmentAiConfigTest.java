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
    @Test void gradingPrefersAdminConfigurationAndKeepsFallbackChain() {
        var models = mock(AiModelConfigRepository.class);
        var keys = mock(AiProviderKeyRepository.class);
        var credentials = mock(TenantCredentialService.class);
        var redis = mock(RedisService.class);
        var config = com.smarthire.domain.master.entity.AiModelConfig.builder()
                .taskType("CODE_GRADING").provider("CUSTOM").modelName("admin-grader")
                .isActive(true).fallbackChain("[{\"provider\":\"CUSTOM\",\"model\":\"backup-grader\"}]").build();
        when(models.findByTaskType("CODE_GRADING")).thenReturn(Optional.of(config));
        when(keys.findFirstByProviderAndIsDefaultTrueAndStatus("CUSTOM", "ACTIVE")).thenReturn(Optional.of(
                com.smarthire.domain.master.entity.AiProviderKey.builder()
                        .apiKeyEncrypted("encrypted").endpointUrl("https://grader.example/v1").build()));
        when(credentials.decrypt("MASTER_AI_KEY", "encrypted")).thenReturn("admin-key");
        var provider = new DynamicAiConfigProvider(models, keys, credentials, redis, new ObjectMapper(),
                "cv-key", "cv-model", 30, "interview-key", "interview-model", 60);

        var grading = provider.resolveConfig("ASSESSMENT_GRADING");
        assertThat(grading.taskType()).isEqualTo("ASSESSMENT_GRADING");
        assertThat(grading.provider()).isEqualTo("CUSTOM");
        assertThat(grading.modelName()).isEqualTo("admin-grader");
        assertThat(grading.apiKey()).isEqualTo("admin-key");
        assertThat(grading.endpointUrl()).isEqualTo("https://grader.example/v1");
        assertThat(grading.hasFailover()).isTrue();
        assertThat(provider.resolveExecutionChain("ASSESSMENT_GRADING"))
                .extracting(DynamicAiConfigProvider.ResolvedAiConfig::modelName)
                .containsExactly("admin-grader", "backup-grader");
        verify(models, never()).findByTaskType("INTERVIEW_GEN");
    }

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

    @Test void assessmentGenUsesQuestionGenAdminConfigAndFallbackChain() {
        var models = mock(AiModelConfigRepository.class);
        var keys = mock(AiProviderKeyRepository.class);
        var credentials = mock(TenantCredentialService.class);
        var redis = mock(RedisService.class);
        when(redis.get(anyString())).thenReturn(Optional.empty());
        when(redis.exists(anyString())).thenReturn(false);
        var config = com.smarthire.domain.master.entity.AiModelConfig.builder()
                .taskType("QUESTION_GEN").provider("GEMINI").modelName("gemini-2.5-flash")
                .isActive(true)
                .fallbackChain("[{\"provider\":\"GROQ\",\"model\":\"llama-3.3-70b-versatile\"}]")
                .build();
        when(models.findByTaskType("QUESTION_GEN")).thenReturn(Optional.of(config));
        when(models.findByTaskType("CODE_GRADING")).thenReturn(Optional.empty());
        when(keys.findFirstByProviderAndIsDefaultTrueAndStatus("GEMINI", "ACTIVE")).thenReturn(Optional.of(
                com.smarthire.domain.master.entity.AiProviderKey.builder()
                        .apiKeyEncrypted("enc-gemini").build()));
        when(keys.findFirstByProviderAndIsDefaultTrueAndStatus("GROQ", "ACTIVE")).thenReturn(Optional.of(
                com.smarthire.domain.master.entity.AiProviderKey.builder()
                        .apiKeyEncrypted("enc-groq").build()));
        when(credentials.decrypt("MASTER_AI_KEY", "enc-gemini")).thenReturn("gemini-secret");
        when(credentials.decrypt("MASTER_AI_KEY", "enc-groq")).thenReturn("groq-secret");

        var provider = new DynamicAiConfigProvider(models, keys, credentials, redis, new ObjectMapper(),
                "cv-key", "cv-model", 30, "interview-key", "interview-model", 60);

        var assessment = provider.resolveConfig("ASSESSMENT_GEN");
        assertThat(assessment.taskType()).isEqualTo("ASSESSMENT_GEN");
        assertThat(assessment.provider()).isEqualTo("GEMINI");
        assertThat(assessment.modelName()).isEqualTo("gemini-2.5-flash");
        assertThat(assessment.apiKey()).isEqualTo("gemini-secret");
        assertThat(assessment.hasFailover()).isTrue();
        assertThat(provider.resolveExecutionChain("ASSESSMENT_GEN"))
                .extracting(DynamicAiConfigProvider.ResolvedAiConfig::modelName)
                .containsExactly("gemini-2.5-flash", "llama-3.3-70b-versatile");
    }
}
