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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MasterAiConfigServiceTest {

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
                30
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
}
