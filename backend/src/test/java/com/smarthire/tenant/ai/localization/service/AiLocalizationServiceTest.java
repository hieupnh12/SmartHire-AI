package com.smarthire.tenant.ai.localization.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.smarthire.common.redis.RedisService;
import com.smarthire.domain.tenant.entity.AiLocalizedContent;
import com.smarthire.domain.tenant.repository.AiLocalizedContentRepository;
import com.smarthire.multitenancy.context.TenantContext;
import com.smarthire.tenant.cv.ai.CvAiClient;
import com.smarthire.tenant.cv.ai.GeminiCvAiClient;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AiLocalizationServiceTest {

    @Mock
    private AiLocalizedContentRepository repository;

    @Mock
    private RedisService redisService;

    @Mock
    private GeminiCvAiClient aiClient;

    private final ObjectMapper mapper = new ObjectMapper();
    private AiLocalizationService service;

    @BeforeEach
    void setUp() {
        TenantContext.setCurrentTenant("test-tenant");
        service = new AiLocalizationService(repository, redisService, aiClient, mapper);
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Test
    @DisplayName("computeContentHash generates consistent SHA-256 hash")
    void testComputeContentHash() {
        ObjectNode node1 = mapper.createObjectNode();
        node1.put("verdict", "Candidate is a good fit for Senior Java");
        node1.put("advice", "Proceed to interview");

        ObjectNode node2 = mapper.createObjectNode();
        node2.put("advice", "Proceed to interview");
        node2.put("verdict", "Candidate is a good fit for Senior Java");

        String hash1 = service.computeContentHash(node1);
        String hash2 = service.computeContentHash(node2);

        assertThat(hash1).isNotEmpty();
        assertThat(hash1).isEqualTo(hash2);
    }

    @Test
    @DisplayName("localize with same source and target locale returns immediately without AI call")
    void testLocalizeSameLocale() throws Exception {
        ObjectNode content = mapper.createObjectNode().put("verdict", "Ứng viên có kinh nghiệm Spring Boot");

        var response = service.localize("CV_SCREENING", 1L, "vi", "vi", content);

        assertThat(response.cached()).isTrue();
        assertThat(response.localizedContent().get("verdict").asText()).isEqualTo("Ứng viên có kinh nghiệm Spring Boot");
        verify(aiClient, never()).completeForTask(anyString(), anyString(), anyString());
    }

    @Test
    @DisplayName("localize hits Redis cache (L1)")
    void testLocalizeRedisHit() throws Exception {
        ObjectNode content = mapper.createObjectNode().put("verdict", "Ứng viên có kinh nghiệm");
        String hash = service.computeContentHash(content);

        String cachedJson = "{\"verdict\":\"候補者は実務経験があります\"}";
        when(redisService.get(anyString())).thenReturn(Optional.of(cachedJson));

        var response = service.localize("CV_SCREENING", 1L, "ja", "vi", content);

        assertThat(response.cached()).isTrue();
        assertThat(response.locale()).isEqualTo("ja");
        assertThat(response.localizedContent().get("verdict").asText()).isEqualTo("候補者は実務経験があります");
        verify(repository, never()).findByEntityTypeAndEntityIdAndContentHashAndLocale(anyString(), any(), anyString(), anyString());
        verify(aiClient, never()).completeForTask(anyString(), anyString(), anyString());
    }

    @Test
    @DisplayName("localize misses Redis but hits DB cache (L2) and writes back to Redis")
    void testLocalizeDbHit() throws Exception {
        ObjectNode content = mapper.createObjectNode().put("verdict", "Ứng viên có kinh nghiệm");
        String hash = service.computeContentHash(content);

        when(redisService.get(anyString())).thenReturn(Optional.empty());

        AiLocalizedContent dbRow = AiLocalizedContent.builder()
                .entityType("CV_SCREENING")
                .entityId(1L)
                .contentHash(hash)
                .locale("ja")
                .sourceLocale("vi")
                .localizedJson("{\"verdict\":\"DBキャッシュの日本語評価\"}")
                .build();
        when(repository.findByEntityTypeAndEntityIdAndContentHashAndLocale("CV_SCREENING", 1L, hash, "ja"))
                .thenReturn(Optional.of(dbRow));

        var response = service.localize("CV_SCREENING", 1L, "ja", "vi", content);

        assertThat(response.cached()).isTrue();
        assertThat(response.localizedContent().get("verdict").asText()).isEqualTo("DBキャッシュの日本語評価");
        verify(redisService).set(anyString(), eq("{\"verdict\":\"DBキャッシュの日本語評価\"}"), any());
        verify(aiClient, never()).completeForTask(anyString(), anyString(), anyString());
    }

    @Test
    @DisplayName("localize misses all caches, calls AI, persists to DB and Redis")
    void testLocalizeAiCall() throws Exception {
        ObjectNode content = mapper.createObjectNode().put("verdict", "Ứng viên phù hợp với vị trí Java");
        String hash = service.computeContentHash(content);

        when(redisService.get(anyString())).thenReturn(Optional.empty());
        when(repository.findByEntityTypeAndEntityIdAndContentHashAndLocale("CV_SCREENING", 1L, hash, "ja"))
                .thenReturn(Optional.empty());

        String aiResponse = "{\"verdict\":\"候補者はJavaポジションに適しています\"}";
        when(aiClient.completeForTask(eq("AI_TRANSLATION"), anyString(), anyString()))
                .thenReturn(new GeminiCvAiClient.AiJsonCompletion(aiResponse, 100, 50, "GEMINI", "gemini-3.5-flash-lite"));

        var response = service.localize("CV_SCREENING", 1L, "ja", "vi", content);

        assertThat(response.cached()).isFalse();
        assertThat(response.locale()).isEqualTo("ja");
        assertThat(response.localizedContent().get("verdict").asText()).isEqualTo("候補者はJavaポジションに適しています");

        verify(repository).save(any(AiLocalizedContent.class));
        verify(redisService).set(anyString(), anyString(), any());
    }

    @Test
    @DisplayName("localize gracefully falls back to original content if AI call throws exception")
    void testLocalizeAiFallbackOnException() throws Exception {
        ObjectNode content = mapper.createObjectNode().put("verdict", "Bản gốc tiếng Việt");
        String hash = service.computeContentHash(content);

        when(redisService.get(anyString())).thenReturn(Optional.empty());
        when(repository.findByEntityTypeAndEntityIdAndContentHashAndLocale("CV_SCREENING", 1L, hash, "ja"))
                .thenReturn(Optional.empty());

        when(aiClient.completeForTask(eq("AI_TRANSLATION"), anyString(), anyString()))
                .thenThrow(new RuntimeException("Gemini quota 429 exceeded"));

        var response = service.localize("CV_SCREENING", 1L, "ja", "vi", content);

        assertThat(response.cached()).isFalse();
        assertThat(response.localizedContent().get("verdict").asText()).isEqualTo("Bản gốc tiếng Việt");
    }
}

