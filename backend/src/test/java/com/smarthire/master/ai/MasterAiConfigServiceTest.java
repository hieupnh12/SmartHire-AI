package com.smarthire.master.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.common.redis.RedisService;
import com.smarthire.config.ai.DynamicAiConfigProvider;
import com.smarthire.domain.master.entity.AiModelConfig;
import com.smarthire.domain.master.entity.AiProviderKey;
import com.smarthire.domain.master.repository.AiModelConfigRepository;
import com.smarthire.domain.master.repository.AiProviderKeyRepository;
import com.smarthire.domain.master.repository.PlatformAuditLogRepository;
import com.smarthire.master.ai.dto.AiModelConfigDto;
import com.smarthire.master.ai.dto.AiProviderKeyDto;
import com.smarthire.master.ai.service.MasterAiConfigService;
import com.smarthire.multitenancy.service.TenantCredentialService;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import com.smarthire.master.ai.dto.AiTestConnectionRequest;
import com.smarthire.master.ai.dto.AiTestConnectionResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

@ExtendWith(MockitoExtension.class)
class MasterAiConfigServiceTest {

    @Test
    void interviewFallbackDoesNotReuseCvCredentialsOrModel() {
        when(modelConfigRepository.findByTaskType("INTERVIEW_NLP")).thenReturn(java.util.Optional.empty());
        var result = configProvider.resolveConfig("INTERVIEW_NLP");
        assertThat(result.apiKey()).isEqualTo("interview-key");
        assertThat(result.modelName()).isEqualTo("gemini-2.5-flash");
        assertThat(result.maxTokens()).isEqualTo(8192);
    }

    @Mock
    private AiProviderKeyRepository providerKeyRepository;

    @Mock
    private AiModelConfigRepository modelConfigRepository;

    @Mock
    private PlatformAuditLogRepository auditLogRepository;

    @Mock
    private TenantCredentialService credentialService;

    @Mock
    private RedisService redisService;

    private DynamicAiConfigProvider configProvider;
    private MasterAiConfigService aiConfigService;
    private ObjectMapper mapper;

    @BeforeEach
    void setUp() {
        mapper = new ObjectMapper();
        configProvider = new DynamicAiConfigProvider(
                modelConfigRepository,
                providerKeyRepository,
                credentialService,
                redisService,
                mapper,
                "fallback-gemini-key",
                "gemini-2.0-flash",
                30, "interview-key", "gemini-2.5-flash", 60
        );
        aiConfigService = new MasterAiConfigService(
                providerKeyRepository,
                modelConfigRepository,
                auditLogRepository,
                credentialService,
                configProvider,
                mapper
        );
    }

    @Test
    void getAllProviderKeys_ReturnsMaskedKeys() {
        when(credentialService.decrypt(anyString(), anyString())).thenReturn("AIzaSyB3123456789xyz4xK9");
        AiProviderKey key = AiProviderKey.builder()
                .id(1L)
                .provider("GEMINI")
                .keyAlias("Primary Key")
                .apiKeyEncrypted("v1:encrypted")
                .status("ACTIVE")
                .isDefault(true)
                .build();
        when(providerKeyRepository.findAll()).thenReturn(List.of(key));

        List<AiProviderKeyDto> dtos = aiConfigService.getAllProviderKeys();
        assertThat(dtos).hasSize(1);
        assertThat(dtos.get(0).getMaskedKey()).contains("••••••••");
        assertThat(dtos.get(0).getKeyAlias()).isEqualTo("Primary Key");
    }

    @Test
    void saveProviderKey_EncryptsRawApiKeyAndEvictsCache() {
        when(credentialService.encrypt(eq("MASTER_AI_KEY"), eq("new-raw-key-12345"))).thenReturn("v1:encrypted-new");
        when(providerKeyRepository.save(any())).thenAnswer(inv -> {
            AiProviderKey k = inv.getArgument(0);
            k.setId(10L);
            return k;
        });

        AiProviderKeyDto input = AiProviderKeyDto.builder()
                .provider("GEMINI")
                .keyAlias("Test Key")
                .apiKey("new-raw-key-12345")
                .isDefault(true)
                .build();

        AiProviderKeyDto saved = aiConfigService.saveProviderKey(input, "admin@smarthire.top");
        assertThat(saved.getId()).isEqualTo(10L);
        verify(credentialService).encrypt(eq("MASTER_AI_KEY"), eq("new-raw-key-12345"));
        verify(auditLogRepository).save(any());
    }

    @Test
    void updateTaskConfig_UpdatesModelAndEvictsCache() {
        AiModelConfig existing = AiModelConfig.builder()
                .id(1L)
                .taskType("CV_PARSING")
                .taskName("CV Extraction")
                .provider("GEMINI")
                .modelName("gemini-1.5-flash")
                .temperature(new BigDecimal("0.20"))
                .maxTokens(2048)
                .timeoutSeconds(30)
                .build();

        when(modelConfigRepository.findByTaskType("CV_PARSING")).thenReturn(Optional.of(existing));
        when(modelConfigRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        AiModelConfigDto update = AiModelConfigDto.builder()
                .modelName("gemini-2.0-flash")
                .temperature(new BigDecimal("0.10"))
                .build();

        AiModelConfigDto result = aiConfigService.updateTaskConfig("CV_PARSING", update, "admin@smarthire.top");
        assertThat(result.getModelName()).isEqualTo("gemini-2.0-flash");
        assertThat(result.getTemperature()).isEqualTo(new BigDecimal("0.10"));
        verify(redisService).delete(contains("CV_PARSING"));
    }

    @Test
    void dynamicAiConfigProvider_ResolvesFallbackWhenDbEmpty() {
        when(redisService.get(anyString())).thenReturn(Optional.empty());
        when(modelConfigRepository.findByTaskType("CV_PARSING")).thenReturn(Optional.empty());

        DynamicAiConfigProvider.ResolvedAiConfig config = configProvider.resolveConfig("CV_PARSING");
        assertThat(config.modelName()).isEqualTo("gemini-2.0-flash");
        assertThat(config.apiKey()).isEqualTo("fallback-gemini-key");
    }

    @Test
    void testConnection_DeepSeek_UsesDeepSeekEndpointAndChatModel() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        RestClient mockRestClient = builder.build();

        MasterAiConfigService serviceWithMock = new MasterAiConfigService(
                providerKeyRepository,
                modelConfigRepository,
                auditLogRepository,
                credentialService,
                configProvider,
                mapper,
                mockRestClient
        );

        server.expect(requestTo("https://api.deepseek.com/chat/completions"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("Authorization", "Bearer sk-deepseek-test-123"))
                .andExpect(content().string(containsString("\"model\":\"deepseek-chat\"")))
                .andRespond(withSuccess("{\"choices\":[{\"message\":{\"content\":\"pong\"}}]}", MediaType.APPLICATION_JSON));

        AiTestConnectionRequest req = AiTestConnectionRequest.builder()
                .provider("DEEPSEEK")
                .apiKey("sk-deepseek-test-123")
                .build();

        AiTestConnectionResponse res = serviceWithMock.testConnection(req);

        server.verify();
        assertThat(res.getSuccess()).isTrue();
        assertThat(res.getModelVersion()).isEqualTo("deepseek:deepseek-chat");
        assertThat(res.getMessage()).contains("DEEPSEEK");
    }

    @Test
    void testConnection_Anthropic_UsesAnthropicEndpoint() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        RestClient mockRestClient = builder.build();

        MasterAiConfigService serviceWithMock = new MasterAiConfigService(
                providerKeyRepository,
                modelConfigRepository,
                auditLogRepository,
                credentialService,
                configProvider,
                mapper,
                mockRestClient
        );

        server.expect(requestTo("https://api.anthropic.com/v1/messages"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("x-api-key", "sk-ant-test-123"))
                .andExpect(header("anthropic-version", "2023-06-01"))
                .andExpect(content().string(containsString("\"model\":\"claude-3-5-haiku-20241022\"")))
                .andRespond(withSuccess("{\"content\":[{\"text\":\"pong\"}]}", MediaType.APPLICATION_JSON));

        AiTestConnectionRequest req = AiTestConnectionRequest.builder()
                .provider("ANTHROPIC")
                .apiKey("sk-ant-test-123")
                .build();

        AiTestConnectionResponse res = serviceWithMock.testConnection(req);

        server.verify();
        assertThat(res.getSuccess()).isTrue();
        assertThat(res.getModelVersion()).isEqualTo("anthropic:claude-3-5-haiku-20241022");
    }

    @Test
    void dynamicAiConfigProvider_ResolvesEndpointUrlAndActiveKey() {
        when(redisService.get(anyString())).thenReturn(Optional.empty());
        AiModelConfig taskCfg = AiModelConfig.builder()
                .taskType("CV_PARSING")
                .provider("OPENAI")
                .modelName("gpt-4o-mini")
                .isActive(true)
                .build();
        AiProviderKey activeKey = AiProviderKey.builder()
                .provider("OPENAI")
                .apiKeyEncrypted("v1:enc")
                .endpointUrl("https://proxy.example.com/v1/chat/completions")
                .status("ACTIVE")
                .isDefault(true)
                .build();
        when(modelConfigRepository.findByTaskType("CV_PARSING")).thenReturn(Optional.of(taskCfg));
        when(providerKeyRepository.findFirstByProviderAndIsDefaultTrueAndStatus("OPENAI", "ACTIVE"))
                .thenReturn(Optional.of(activeKey));
        when(credentialService.decrypt("MASTER_AI_KEY", "v1:enc")).thenReturn("sk-openai-real");

        var resolved = configProvider.resolveConfig("CV_PARSING");
        assertThat(resolved.apiKey()).isEqualTo("sk-openai-real");
        assertThat(resolved.endpointUrl()).isEqualTo("https://proxy.example.com/v1/chat/completions");
    }

    @Test
    void aiUsageMeteringService_CalculatesModelCostAndExtractsTokens() throws Exception {
        var pricingRepo = mock(com.smarthire.domain.master.repository.AiModelPricingRepository.class);
        var tenantRepo = mock(com.smarthire.domain.master.repository.TenantInfoRepository.class);
        var aiUsageRepo = mock(com.smarthire.domain.master.repository.TenantAiUsageDailyRepository.class);
        var dailyRepo = mock(com.smarthire.domain.master.repository.TenantUsageDailyRepository.class);

        when(pricingRepo.findByProviderIgnoreCaseAndModelNameIgnoreCase("GEMINI", "gemini-2.5-flash"))
                .thenReturn(Optional.of(com.smarthire.domain.master.entity.AiModelPricing.builder()
                        .provider("GEMINI")
                        .modelName("gemini-2.5-flash")
                        .inputPricePer1mTokens(new BigDecimal("0.1500"))
                        .outputPricePer1mTokens(new BigDecimal("0.6000"))
                        .build()));

        var metering = new com.smarthire.config.ai.AiUsageMeteringService(
                tenantRepo, aiUsageRepo, dailyRepo, pricingRepo, null);

        // 10,000 prompt tokens ($0.0015) + 5,000 completion tokens ($0.0030) = $0.004500
        BigDecimal cost = metering.calculateCostUsd("GEMINI", "gemini-2.5-flash", 10_000L, 5_000L);
        assertThat(cost).isEqualByComparingTo(new BigDecimal("0.004500"));

        var geminiJson = mapper.readTree("{\"usageMetadata\":{\"promptTokenCount\":1200,\"candidatesTokenCount\":350}}");
        long[] tokens = com.smarthire.config.ai.AiUsageMeteringService.extractTokenUsage(geminiJson, "", "");
        assertThat(tokens[0]).isEqualTo(1200L);
        assertThat(tokens[1]).isEqualTo(350L);
    }

    @Test
    void masterAiUsageAndQuotaService_OverridesQuotaAndTogglesKillSwitch() {
        var tenantRepo = mock(com.smarthire.domain.master.repository.TenantInfoRepository.class);
        var subRepo = mock(com.smarthire.domain.master.repository.TenantSubscriptionRepository.class);
        var dailyRepo = mock(com.smarthire.domain.master.repository.TenantUsageDailyRepository.class);
        var aiUsageRepo = mock(com.smarthire.domain.master.repository.TenantAiUsageDailyRepository.class);
        var quotaRedis = mock(com.smarthire.multitenancy.quota.TenantQuotaRedisService.class);

        var tenant = com.smarthire.domain.master.entity.TenantInfo.builder()
                .id(5L).code("acme").name("ACME Corp").build();
        var plan = com.smarthire.domain.master.entity.SubscriptionPlan.builder()
                .id(2L).code("PRO").name("Pro Plan").maxCvParses(500).maxAiInterviewHours(20).build();
        var sub = com.smarthire.domain.master.entity.TenantSubscription.builder()
                .id(9L).tenantId(5L).planId(2L).status("ACTIVE")
                .planCodeSnapshot("PRO").planNameSnapshot("Pro Plan")
                .snapshotMaxCvParses(500).snapshotMaxAiInterviewHours(20).build();

        when(tenantRepo.findById(5L)).thenReturn(Optional.of(tenant));
        when(quotaRedis.resolveSubscriptionAndPlan("acme"))
                .thenReturn(new com.smarthire.multitenancy.quota.TenantQuotaRedisService.ResolvedSubscription(tenant, sub, plan));
        when(aiUsageRepo.findByTenantIdAndUsageDateBetweenOrderByUsageDateAsc(eq(5L), any(), any()))
                .thenReturn(List.of());

        var service = new com.smarthire.master.ai.service.MasterAiUsageAndQuotaService(
                tenantRepo, subRepo, dailyRepo, aiUsageRepo, auditLogRepository, quotaRedis);

        // 1. Enable Kill Switch
        var killReq = com.smarthire.master.ai.dto.TenantAiQuotaUpdateRequest.builder()
                .killSwitch(true)
                .build();
        var killedDto = service.updateTenantAiQuota(5L, killReq, "admin@smarthire.top");
        assertThat(killedDto.isAiKillSwitch()).isTrue();
        assertThat(killedDto.getCvLimit()).isEqualTo(0);
        assertThat(killedDto.getInterviewHoursLimit()).isEqualTo(0);
        verify(quotaRedis).evictCache("acme");

        // 2. Override with Bonus Quota (e.g. 800 CV parses, 35 hours)
        var overrideReq = com.smarthire.master.ai.dto.TenantAiQuotaUpdateRequest.builder()
                .cvLimit(800)
                .interviewHoursLimit(35)
                .build();
        var overriddenDto = service.updateTenantAiQuota(5L, overrideReq, "admin@smarthire.top");
        assertThat(overriddenDto.isAiKillSwitch()).isFalse();
        assertThat(overriddenDto.getCvLimit()).isEqualTo(800);
        assertThat(overriddenDto.getInterviewHoursLimit()).isEqualTo(35);
    }

    @Test
    @SuppressWarnings("unchecked")
    void aiRateLimiterService_EnforcesRpmAndTpmLimitsWithHttp429() {
        var stringRedis = mock(org.springframework.data.redis.core.StringRedisTemplate.class);
        var valOps = mock(org.springframework.data.redis.core.ValueOperations.class);
        var settingService = mock(com.smarthire.master.ai.service.SystemSettingService.class);
        when(stringRedis.opsForValue()).thenReturn(valOps);

        when(settingService.getSettingValue(com.smarthire.config.ai.AiRateLimiterService.KEY_ENABLED))
                .thenReturn(Optional.of("true"));
        when(settingService.getSettingValue(com.smarthire.config.ai.AiRateLimiterService.KEY_DEFAULT_RPM))
                .thenReturn(Optional.of("2"));
        when(settingService.getSettingValue(com.smarthire.config.ai.AiRateLimiterService.KEY_DEFAULT_TPM))
                .thenReturn(Optional.of("50000"));
        when(settingService.getSettingValue(com.smarthire.config.ai.AiRateLimiterService.KEY_TENANT_OVERRIDES))
                .thenReturn(Optional.empty());

        var rateLimiter = new com.smarthire.config.ai.AiRateLimiterService(stringRedis, settingService, mapper);

        // Request 1 & 2 succeed (RPM <= 2)
        when(valOps.get(contains("ratelimit:ai:tpm:acme:"))).thenReturn("1000");
        when(valOps.increment(contains("ratelimit:ai:rpm:acme:"))).thenReturn(1L, 2L, 3L);

        rateLimiter.checkAndAcquire("acme", "CV_PARSING");
        rateLimiter.checkAndAcquire("acme", "CV_PARSING");

        // Request 3 exceeds RPM limit (3 > 2) -> throws HTTP 429 and rolls back counter
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> rateLimiter.checkAndAcquire("acme", "CV_PARSING"))
                .isInstanceOf(com.smarthire.common.exception.BusinessException.class)
                .satisfies(ex -> {
                    var be = (com.smarthire.common.exception.BusinessException) ex;
                    assertThat(be.getStatus().value()).isEqualTo(429);
                    assertThat(be.getCode()).isEqualTo("AI_RPM_LIMIT_EXCEEDED");
                });
        verify(valOps).increment(contains("ratelimit:ai:rpm:acme:"), eq(-1L));

        // When TPM is already >= 50,000 -> throws HTTP 429 AI_TPM_LIMIT_EXCEEDED
        when(valOps.get(contains("ratelimit:ai:tpm:acme:"))).thenReturn("55000");
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> rateLimiter.checkAndAcquire("acme", "INTERVIEW_GEN"))
                .isInstanceOf(com.smarthire.common.exception.BusinessException.class)
                .satisfies(ex -> {
                    var be = (com.smarthire.common.exception.BusinessException) ex;
                    assertThat(be.getStatus().value()).isEqualTo(429);
                    assertThat(be.getCode()).isEqualTo("AI_TPM_LIMIT_EXCEEDED");
                });
    }

    @Test
    void modelPricingCrud_SavesUpdatesAndDeletesPricing() {
        var pricingRepo = mock(com.smarthire.domain.master.repository.AiModelPricingRepository.class);
        aiConfigService.setModelPricingRepository(pricingRepo);

        when(pricingRepo.findByProviderIgnoreCaseAndModelNameIgnoreCase("GEMINI", "gemini-3.6-flash"))
                .thenReturn(Optional.empty());
        when(pricingRepo.save(any())).thenAnswer(inv -> {
            var entity = (com.smarthire.domain.master.entity.AiModelPricing) inv.getArgument(0);
            if (entity.getId() == null) {
                entity.setId(42L);
            }
            return entity;
        });

        var createDto = com.smarthire.master.ai.dto.AiModelPricingDto.builder()
                .modelName("gemini-3.6-flash")
                .provider("GEMINI")
                .inputPricePer1mTokens(new BigDecimal("0.0750"))
                .outputPricePer1mTokens(new BigDecimal("0.3000"))
                .isActive(true)
                .build();

        var saved = aiConfigService.saveModelPricing(createDto, "admin@smarthire.top");
        assertThat(saved.getId()).isEqualTo(42L);
        assertThat(saved.getModelName()).isEqualTo("gemini-3.6-flash");
        assertThat(saved.getInputPricePer1mTokens()).isEqualByComparingTo("0.0750");
        verify(auditLogRepository).save(any());

        var existingEntity = com.smarthire.domain.master.entity.AiModelPricing.builder()
                .id(42L)
                .modelName("gemini-3.6-flash")
                .provider("GEMINI")
                .inputPricePer1mTokens(new BigDecimal("0.0750"))
                .outputPricePer1mTokens(new BigDecimal("0.3000"))
                .isActive(true)
                .build();
        when(pricingRepo.findById(42L)).thenReturn(Optional.of(existingEntity));

        aiConfigService.deleteModelPricing(42L, "admin@smarthire.top");
        verify(pricingRepo).delete(existingEntity);
    }
}


