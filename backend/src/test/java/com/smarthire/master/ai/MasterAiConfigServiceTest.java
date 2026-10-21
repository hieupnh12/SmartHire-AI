package com.smarthire.master.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.common.redis.RedisService;
import com.smarthire.config.ai.DynamicAiConfigProvider;
import com.smarthire.domain.master.entity.AiModelConfig;
import com.smarthire.domain.master.entity.AiProviderKey;
import com.smarthire.domain.master.repository.AiModelConfigRepository;
import com.smarthire.domain.master.repository.AiProviderKeyRepository;
import com.smarthire.domain.master.repository.PlatformAuditLogRepository;
import com.smarthire.master.ai.dto.AiFallbackStep;
import com.smarthire.master.ai.dto.AiModelConfigDto;
import com.smarthire.master.ai.dto.AiProviderKeyDto;
import com.smarthire.master.ai.service.MasterAiConfigService;
import com.smarthire.multitenancy.service.TenantCredentialService;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import com.smarthire.domain.master.entity.AiModelPricing;
import com.smarthire.domain.master.repository.AiModelPricingRepository;
import com.smarthire.master.ai.dto.AiModelPricingDto;
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
    void customEndpointDiscoversModelWhenConnectionTestOmitsModel() {
        var builder = RestClient.builder();
        var server = MockRestServiceServer.bindTo(builder).build();
        var service = new MasterAiConfigService(providerKeyRepository, modelConfigRepository, auditLogRepository,
                credentialService, configProvider, mapper, builder.build());
        server.expect(requestTo("https://llama.example/v1/models"))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header("Authorization", "Bearer test-key"))
                .andRespond(withSuccess("{\"data\":[{\"id\":\"local-llama\"}]}", MediaType.APPLICATION_JSON));
        server.expect(requestTo("https://llama.example/v1/chat/completions"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(jsonPath("$.model").value("local-llama"))
                .andRespond(withSuccess("{}", MediaType.APPLICATION_JSON));
        var response = service.testConnection(AiTestConnectionRequest.builder().provider("OPENAI")
                .apiKey("test-key").endpointUrl("https://llama.example/v1/chat/completions/").build());
        assertThat(response.getSuccess()).isTrue();
        assertThat(response.getModelVersion()).isEqualTo("openai:local-llama");
        server.verify();
    }

    @Test
    void customEndpointWithoutModelsDoesNotSendInvalidChatRequest() {
        var builder = RestClient.builder();
        var server = MockRestServiceServer.bindTo(builder).build();
        var service = new MasterAiConfigService(providerKeyRepository, modelConfigRepository, auditLogRepository,
                credentialService, configProvider, mapper, builder.build());
        server.expect(requestTo("https://llama.example/v1/models"))
                .andRespond(withSuccess("{\"data\":[]}", MediaType.APPLICATION_JSON));
        var response = service.testConnection(AiTestConnectionRequest.builder().provider("OPENAI")
                .apiKey("test-key").endpointUrl("https://llama.example/v1").build());
        assertThat(response.getSuccess()).isFalse();
        assertThat(response.getMessage()).contains("specify modelName");
        server.verify();
    }

    @Test
    void nativeSpeechUsesDedicatedInterviewFallbackInsteadOfCvKey() {
        org.springframework.test.util.ReflectionTestUtils.setField(configProvider, "interviewSpeechKey", "speech-key");
        var speech = configProvider.resolveInterviewSpeechConfig();
        assertThat(speech.provider()).isEqualTo("GEMINI");
        assertThat(speech.apiKey()).isEqualTo("speech-key");
        assertThat(speech.modelName()).isEqualTo("gemini-3.1-flash-lite");
        verify(modelConfigRepository, never()).findByTaskType(anyString());
    }

    @Test
    void nativeSpeechWithoutGeminiKeyDoesNotUseOpenAiOrCvKey() {
        assertThat(configProvider.resolveInterviewSpeechConfig().apiKey()).isEmpty();
    }

    @Test
    void nativeSpeechWithGeminiTextProviderUsesInterviewKey() {
        org.springframework.test.util.ReflectionTestUtils.setField(configProvider, "interviewProvider", "GEMINI");
        assertThat(configProvider.resolveInterviewSpeechConfig().apiKey()).isEqualTo("interview-key");
    }

    @Test
    void nativeSpeechPrefersActiveGeminiKeyRegardlessOfChatProvider() {
        var key = new AiProviderKey(); key.setApiKeyEncrypted("encrypted-speech-key");
        when(providerKeyRepository.findFirstByProviderAndIsDefaultTrueAndStatus("GEMINI", "ACTIVE"))
                .thenReturn(Optional.of(key));
        when(credentialService.decrypt("MASTER_AI_KEY", "encrypted-speech-key")).thenReturn("speech-key");
        assertThat(configProvider.resolveInterviewSpeechConfig().apiKey()).isEqualTo("speech-key");
        verify(modelConfigRepository, never()).findByTaskType(anyString());
    }

    @Test
    void customProviderTestConnectionUsesModelDiscoveredFromEndpoint() {
        var builder = RestClient.builder();
        var server = MockRestServiceServer.bindTo(builder).build();
        var service = new MasterAiConfigService(providerKeyRepository, modelConfigRepository, auditLogRepository,
                credentialService, configProvider, mapper, builder.build());
        server.expect(requestTo("https://litellm.example/v1/models"))
                .andRespond(withSuccess("{\"data\":[{\"id\":\"vanilj/llama-3-8b-instruct-32k-v0.1:Q4_K_M\"}]}", MediaType.APPLICATION_JSON));
        server.expect(requestTo("https://litellm.example/v1/chat/completions"))
                .andExpect(org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath("$.model")
                        .value("vanilj/llama-3-8b-instruct-32k-v0.1:Q4_K_M"))
                .andRespond(withSuccess("{}", MediaType.APPLICATION_JSON));
        var response = service.testConnection(AiTestConnectionRequest.builder().provider("CUSTOM")
                .apiKey("litellm-key").endpointUrl("https://litellm.example/v1").build());
        assertThat(response.getSuccess()).isTrue();
        server.verify();
    }

    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(strings = {"https://llama.example/v1", "https://llama.example/v1/chat/completions/"})
    void testConnectionAcceptsBaseOrFullChatEndpoint(String endpoint) {
        var builder = RestClient.builder();
        var server = MockRestServiceServer.bindTo(builder).build();
        var service = new MasterAiConfigService(providerKeyRepository, modelConfigRepository, auditLogRepository,
                credentialService, configProvider, mapper, builder.build());
        server.expect(requestTo("https://llama.example/v1/chat/completions"))
                .andRespond(withSuccess("{}", MediaType.APPLICATION_JSON));
        var request = AiTestConnectionRequest.builder().provider("OPENAI").modelName("llama")
                .apiKey("llama-test-key").endpointUrl(endpoint).build();
        assertThat(service.testConnection(request).getSuccess()).isTrue();
        server.verify();
    }

    @Test
    void interviewFallbackDoesNotReuseCvCredentialsOrModel() {
        when(modelConfigRepository.findByTaskType("INTERVIEW_NLP")).thenReturn(java.util.Optional.empty());
        var result = configProvider.resolveConfig("INTERVIEW_NLP");
        assertThat(result.apiKey()).isEqualTo("interview-key");
        assertThat(result.provider()).isEqualTo("OPENAI");
        assertThat(result.modelName()).isEqualTo("vanilj/llama-3-8b-instruct-32k-v0.1:Q4_K_M");
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

    @Mock
    private AiModelPricingRepository modelPricingRepository;

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
                mapper, "fallback-key", "gemini-2.0-flash", 30,
                "interview-key", "vanilj/llama-3-8b-instruct-32k-v0.1:Q4_K_M", 60
        );
        aiConfigService = new MasterAiConfigService(
                providerKeyRepository,
                modelConfigRepository,
                auditLogRepository,
                credentialService,
                configProvider,
                mapper
        );
        aiConfigService.setModelPricingRepository(modelPricingRepository);
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
        assertThat(config.provider()).isEqualTo("GEMINI");
        assertThat(config.modelName()).isEqualTo("gemini-2.0-flash");
        assertThat(config.apiKey()).isEqualTo("fallback-key");
        verify(redisService, never()).set(anyString(), any(), any());
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
    void testConnection_AnthropicWithCursorKey_ReturnsFriendlyError() {
        MasterAiConfigService service = new MasterAiConfigService(
                providerKeyRepository,
                modelConfigRepository,
                auditLogRepository,
                credentialService,
                configProvider,
                mapper
        );

        AiTestConnectionRequest req = AiTestConnectionRequest.builder()
                .provider("ANTHROPIC")
                .apiKey("crsr_0d4fa848d1e9702227dcc24c8afe5b1287b25e0b60f31f0d2c7121273c7f9a85")
                .build();

        AiTestConnectionResponse res = service.testConnection(req);
        assertThat(res.getSuccess()).isFalse();
        assertThat(res.getMessage()).contains("Cursor");
        assertThat(res.getMessage()).contains("Cursor / AI");
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

    @Test
    void dynamicAiConfigProvider_ProactivelyRoutesToFailoverWhenPrimaryModelInCooldown() {
        when(redisService.get(anyString())).thenReturn(Optional.empty());
        AiModelConfig taskCfg = AiModelConfig.builder()
                .taskType("CV_PARSING")
                .provider("GEMINI")
                .modelName("gemini-2.5-flash")
                .failoverProvider("OPENAI")
                .failoverModel("gpt-4o-mini")
                .isActive(true)
                .build();
        when(modelConfigRepository.findByTaskType("CV_PARSING")).thenReturn(Optional.of(taskCfg));

        AiProviderKey geminiKey = AiProviderKey.builder()
                .provider("GEMINI")
                .apiKeyEncrypted("v1:gemini-enc")
                .status("ACTIVE")
                .isDefault(true)
                .build();
        AiProviderKey openAiKey = AiProviderKey.builder()
                .provider("OPENAI")
                .apiKeyEncrypted("v1:openai-enc")
                .status("ACTIVE")
                .isDefault(true)
                .build();

        when(providerKeyRepository.findFirstByProviderAndIsDefaultTrueAndStatus("GEMINI", "ACTIVE"))
                .thenReturn(Optional.of(geminiKey));
        when(providerKeyRepository.findFirstByProviderAndIsDefaultTrueAndStatus("OPENAI", "ACTIVE"))
                .thenReturn(Optional.of(openAiKey));
        when(credentialService.decrypt("MASTER_AI_KEY", "v1:gemini-enc")).thenReturn("gemini-secret");
        when(credentialService.decrypt("MASTER_AI_KEY", "v1:openai-enc")).thenReturn("openai-secret");

        // Primary model is in cooldown due to 429 in Redis!
        when(redisService.exists(com.smarthire.common.redis.RedisKeys.aiModelCooldown("GEMINI", "gemini-2.5-flash")))
                .thenReturn(true);

        var resolved = configProvider.resolveConfig("CV_PARSING");

        // Proactively routed to failover!
        assertThat(resolved.provider()).isEqualTo("OPENAI");
        assertThat(resolved.modelName()).isEqualTo("gpt-4o-mini");
        assertThat(resolved.apiKey()).isEqualTo("openai-secret");
    }

    @Test
    void markModelCooldown_SetsRedisKeyWithTtl() {
        configProvider.markModelCooldown("GROQ", "qwen/qwen3.8-27b", java.time.Duration.ofSeconds(60));
        verify(redisService).set(
                eq(com.smarthire.common.redis.RedisKeys.aiModelCooldown("GROQ", "qwen/qwen3.8-27b")),
                eq("RATE_LIMITED_429"),
                eq(java.time.Duration.ofSeconds(60))
        );
    }

    @Test
    void resolveExecutionChain_ReturnsFullCascadeWhenNoCooldown() {
        when(redisService.get(anyString())).thenReturn(Optional.empty());
        String chainJson = "[{\"provider\":\"GROQ\",\"model\":\"qwen/qwen3.8-27b\"},{\"provider\":\"OPENROUTER\",\"model\":\"deepseek/deepseek-r1:free\"}]";
        AiModelConfig taskCfg = AiModelConfig.builder()
                .taskType("CV_PARSING")
                .provider("GEMINI")
                .modelName("gemini-2.5-flash")
                .fallbackChain(chainJson)
                .isActive(true)
                .build();
        when(modelConfigRepository.findByTaskType("CV_PARSING")).thenReturn(Optional.of(taskCfg));

        AiProviderKey geminiKey = AiProviderKey.builder().provider("GEMINI").apiKeyEncrypted("v1:gemini-enc").status("ACTIVE").isDefault(true).build();
        AiProviderKey groqKey = AiProviderKey.builder().provider("GROQ").apiKeyEncrypted("v1:groq-enc").status("ACTIVE").isDefault(true).build();
        AiProviderKey routerKey = AiProviderKey.builder().provider("OPENROUTER").apiKeyEncrypted("v1:router-enc").status("ACTIVE").isDefault(true).build();

        when(providerKeyRepository.findFirstByProviderAndIsDefaultTrueAndStatus("GEMINI", "ACTIVE")).thenReturn(Optional.of(geminiKey));
        when(providerKeyRepository.findFirstByProviderAndIsDefaultTrueAndStatus("GROQ", "ACTIVE")).thenReturn(Optional.of(groqKey));
        when(providerKeyRepository.findFirstByProviderAndIsDefaultTrueAndStatus("OPENROUTER", "ACTIVE")).thenReturn(Optional.of(routerKey));

        when(credentialService.decrypt("MASTER_AI_KEY", "v1:gemini-enc")).thenReturn("gemini-secret");
        when(credentialService.decrypt("MASTER_AI_KEY", "v1:groq-enc")).thenReturn("groq-secret");
        when(credentialService.decrypt("MASTER_AI_KEY", "v1:router-enc")).thenReturn("router-secret");

        when(redisService.exists(anyString())).thenReturn(false);

        var chain = configProvider.resolveExecutionChain("CV_PARSING");
        assertThat(chain).hasSize(3);
        assertThat(chain.get(0).provider()).isEqualTo("GEMINI");
        assertThat(chain.get(0).modelName()).isEqualTo("gemini-2.5-flash");
        assertThat(chain.get(1).provider()).isEqualTo("GROQ");
        assertThat(chain.get(1).modelName()).isEqualTo("qwen/qwen3.8-27b");
        assertThat(chain.get(2).provider()).isEqualTo("OPENROUTER");
        assertThat(chain.get(2).modelName()).isEqualTo("deepseek/deepseek-r1:free");
    }

    @Test
    void resolveExecutionChain_SkipsCooldownModelsInCascade() {
        when(redisService.get(anyString())).thenReturn(Optional.empty());
        String chainJson = "[{\"provider\":\"GROQ\",\"model\":\"qwen/qwen3.8-27b\"},{\"provider\":\"OPENROUTER\",\"model\":\"deepseek/deepseek-r1:free\"}]";
        AiModelConfig taskCfg = AiModelConfig.builder()
                .taskType("CV_PARSING")
                .provider("GEMINI")
                .modelName("gemini-2.5-flash")
                .fallbackChain(chainJson)
                .isActive(true)
                .build();
        when(modelConfigRepository.findByTaskType("CV_PARSING")).thenReturn(Optional.of(taskCfg));

        AiProviderKey geminiKey = AiProviderKey.builder().provider("GEMINI").apiKeyEncrypted("v1:gemini-enc").status("ACTIVE").isDefault(true).build();
        AiProviderKey routerKey = AiProviderKey.builder().provider("OPENROUTER").apiKeyEncrypted("v1:router-enc").status("ACTIVE").isDefault(true).build();

        when(providerKeyRepository.findFirstByProviderAndIsDefaultTrueAndStatus("GEMINI", "ACTIVE")).thenReturn(Optional.of(geminiKey));
        when(providerKeyRepository.findFirstByProviderAndIsDefaultTrueAndStatus("OPENROUTER", "ACTIVE")).thenReturn(Optional.of(routerKey));

        when(credentialService.decrypt("MASTER_AI_KEY", "v1:gemini-enc")).thenReturn("gemini-secret");
        when(credentialService.decrypt("MASTER_AI_KEY", "v1:router-enc")).thenReturn("router-secret");

        // Primary and OpenRouter healthy, GROQ step in cooldown
        when(redisService.exists(com.smarthire.common.redis.RedisKeys.aiModelCooldown("GEMINI", "gemini-2.5-flash"))).thenReturn(false);
        when(redisService.exists(com.smarthire.common.redis.RedisKeys.aiModelCooldown("GROQ", "qwen/qwen3.8-27b"))).thenReturn(true);
        when(redisService.exists(com.smarthire.common.redis.RedisKeys.aiModelCooldown("OPENROUTER", "deepseek/deepseek-r1:free"))).thenReturn(false);

        var chain = configProvider.resolveExecutionChain("CV_PARSING");
        assertThat(chain).hasSize(2);
        assertThat(chain.get(0).provider()).isEqualTo("GEMINI");
        assertThat(chain.get(1).provider()).isEqualTo("OPENROUTER");
    }

    @Test
    void updateTaskConfig_SavesFallbackChainJson() {
        AiModelConfig existing = AiModelConfig.builder()
                .id(1L)
                .taskType("CV_PARSING")
                .provider("GEMINI")
                .modelName("gemini-2.5-flash")
                .build();
        when(modelConfigRepository.findByTaskType("CV_PARSING")).thenReturn(Optional.of(existing));
        when(modelConfigRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        AiModelConfigDto update = AiModelConfigDto.builder()
                .modelName("gemini-2.5-flash")
                .fallbackSteps(List.of(
                        new AiFallbackStep("GROQ", "qwen/qwen3.8-27b", 30, new BigDecimal("0.2")),
                        new AiFallbackStep("OPENROUTER", "deepseek/deepseek-r1:free", 45, new BigDecimal("0.1"))
                ))
                .build();

        AiModelConfigDto result = aiConfigService.updateTaskConfig("CV_PARSING", update, "admin@smarthire.top");
        assertThat(result.getFallbackSteps()).hasSize(2);
        assertThat(result.getFallbackSteps().get(0).getProvider()).isEqualTo("GROQ");
        assertThat(result.getFallbackSteps().get(1).getProvider()).isEqualTo("OPENROUTER");
        assertThat(existing.getFallbackChain()).contains("qwen/qwen3.8-27b").contains("deepseek/deepseek-r1:free");
    }

    @Test
    void updateTaskConfig_EditedStepsReplaceStaleChainEchoedByAdminUi() {
        String staleChain = "[{\"model\": \"gemini-3.6-flash-lite\", \"provider\": \"GEMINI\"}]";
        AiModelConfig existing = AiModelConfig.builder()
                .id(1L).taskType("CV_PARSING").provider("GEMINI").modelName("gemini-2.0-flash")
                .failoverProvider("GEMINI").failoverModel("gemini-3.6-flash-lite").fallbackChain(staleChain)
                .build();
        when(modelConfigRepository.findByTaskType("CV_PARSING")).thenReturn(Optional.of(existing));
        when(modelConfigRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        AiModelConfigDto update = AiModelConfigDto.builder()
                .modelName("gemini-3.5-flash-lite")
                .fallbackChain(staleChain)
                .fallbackSteps(List.of(
                        new AiFallbackStep("GEMINI", "gemini-3.1-pro-preview", null, null),
                        new AiFallbackStep("GEMINI", "", null, null)))
                .build();

        aiConfigService.updateTaskConfig("CV_PARSING", update, "admin@smarthire.top");

        assertThat(existing.getModelName()).isEqualTo("gemini-3.5-flash-lite");
        assertThat(existing.getFallbackChain()).contains("gemini-3.1-pro-preview").doesNotContain("gemini-3.6-flash-lite");
        assertThat(existing.getFailoverModel()).isEqualTo("gemini-3.1-pro-preview");
    }

    @Test
    void updateTaskConfig_EmptyStepsClearAllFailover() {
        AiModelConfig existing = AiModelConfig.builder()
                .id(1L).taskType("CV_PARSING").provider("GEMINI").modelName("gemini-3.5-flash-lite")
                .failoverProvider("GEMINI").failoverModel("gemini-3.6-flash-lite")
                .fallbackChain("[{\"model\": \"gemini-3.6-flash-lite\", \"provider\": \"GEMINI\"}]")
                .build();
        when(modelConfigRepository.findByTaskType("CV_PARSING")).thenReturn(Optional.of(existing));
        when(modelConfigRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        aiConfigService.updateTaskConfig("CV_PARSING",
                AiModelConfigDto.builder().fallbackSteps(List.of()).build(), "admin@smarthire.top");

        assertThat(existing.getFallbackChain()).isEqualTo("[]");
        assertThat(existing.getFailoverModel()).isNull();
        assertThat(existing.getFailoverProvider()).isNull();
    }

    @Test
    void saveModelPricing_PersistsRegistryFields() {
        AiModelPricing savedEntity = AiModelPricing.builder()
                .id(10L)
                .modelName("qwen/qwen3.8-27b")
                .provider("GROQ")
                .displayName("Groq Qwen 3.8 27B")
                .contextWindow(131072)
                .supportsJson(true)
                .inputPricePer1mTokens(BigDecimal.ZERO)
                .outputPricePer1mTokens(BigDecimal.ZERO)
                .isActive(true)
                .build();
        when(modelPricingRepository.findByProviderIgnoreCaseAndModelNameIgnoreCase("GROQ", "qwen/qwen3.8-27b")).thenReturn(Optional.empty());
        when(modelPricingRepository.save(any())).thenReturn(savedEntity);

        AiModelPricingDto request = AiModelPricingDto.builder()
                .modelName("qwen/qwen3.8-27b")
                .provider("GROQ")
                .displayName("Groq Qwen 3.8 27B")
                .contextWindow(131072)
                .supportsJson(true)
                .inputPricePer1mTokens(BigDecimal.ZERO)
                .outputPricePer1mTokens(BigDecimal.ZERO)
                .isActive(true)
                .build();

        AiModelPricingDto result = aiConfigService.saveModelPricing(request, "admin@smarthire.top");
        assertThat(result.getDisplayName()).isEqualTo("Groq Qwen 3.8 27B");
        assertThat(result.getContextWindow()).isEqualTo(131072);
        assertThat(result.getSupportsJson()).isTrue();
        assertThat(result.getInputPricePer1mTokens()).isEqualByComparingTo(BigDecimal.ZERO);
    }
}


