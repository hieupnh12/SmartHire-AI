package com.smarthire.tenant.ai.localization.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.smarthire.common.redis.RedisService;
import com.smarthire.domain.tenant.entity.AiLocalizedContent;
import com.smarthire.domain.tenant.repository.AiLocalizedContentRepository;
import com.smarthire.multitenancy.context.TenantContext;
import com.smarthire.tenant.ai.localization.dto.AiLocalizationModels.AiLocalizeResponse;
import com.smarthire.tenant.cv.ai.GeminiCvAiClient;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AiLocalizationService {
    private static final Logger log = LoggerFactory.getLogger(AiLocalizationService.class);
    private static final Duration REDIS_TTL = Duration.ofDays(30);

    private static final String SYSTEM_INSTRUCTION_TEMPLATE = """
            You are a senior professional AI localization engine for enterprise recruiting platform (SmartHire AI).
            Translate the provided recruitment evaluation JSON from %s to %s.

            STRICT LOCALIZATION RULES:
            1. Maintain an accurate, natural, professional HR tone in %s.
            2. PRESERVATION OF TECHNICAL ENTITIES (CRITICAL):
               - DO NOT translate candidate names, technical terms, programming languages, libraries, frameworks, databases, cloud tools, certifications, degrees, school names, company names, or exact CV excerpts (e.g. Java, Spring Boot, PostgreSQL, Docker, AWS, React, FPT University, Senior Backend Developer, TechNova Solutions, etc.). Keep them verbatim.
            3. Maintain the exact JSON structure, keys, and array sizes. Do not invent, remove, or modify JSON keys.
            4. Return strictly valid JSON only. Never wrap in markdown code blocks or add conversational prose.
            """;

    private final AiLocalizedContentRepository repository;
    private final RedisService redisService;
    private final GeminiCvAiClient aiClient;
    private final ObjectMapper mapper;

    public AiLocalizationService(
            AiLocalizedContentRepository repository,
            RedisService redisService,
            GeminiCvAiClient aiClient,
            ObjectMapper mapper) {
        this.repository = repository;
        this.redisService = redisService;
        this.aiClient = aiClient;
        this.mapper = mapper;
    }

    public String computeContentHash(JsonNode content) {
        if (content == null || content.isNull() || content.isEmpty()) {
            return "";
        }
        try {
            Object canonical = mapper.treeToValue(content, Object.class);
            ObjectMapper sortedMapper = mapper.copy().configure(
                    com.fasterxml.jackson.databind.SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS, true);
            String jsonStr = sortedMapper.writeValueAsString(canonical);
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(jsonStr.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder();
            for (byte b : hash) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (Exception ex) {
            log.warn("Failed to compute canonical content hash: {}", ex.getMessage());
            return Integer.toHexString(content.toString().hashCode());
        }
    }

    private String buildRedisKey(String tenant, String entityType, Long entityId, String locale, String hash) {
        String safeTenant = (tenant == null || tenant.isBlank()) ? "default" : tenant.trim().toLowerCase();
        return "tenant:" + safeTenant + ":ai_loc:" + entityType + ":" + entityId + ":" + locale + ":" + hash;
    }

    public Optional<JsonNode> getCached(String entityType, Long entityId, String contentHash, String targetLocale) {
        if (contentHash == null || contentHash.isBlank() || targetLocale == null || targetLocale.isBlank()) {
            return Optional.empty();
        }
        String normLocale = targetLocale.trim().toLowerCase();
        String tenant = TenantContext.getCurrentTenant();
        String redisKey = buildRedisKey(tenant, entityType, entityId, normLocale, contentHash);

        // L1: Redis Cache
        try {
            Optional<String> redisVal = redisService.get(redisKey);
            if (redisVal.isPresent() && !redisVal.get().isBlank()) {
                return Optional.of(mapper.readTree(redisVal.get()));
            }
        } catch (Exception ex) {
            log.warn("Redis lookup failed for key {}: {}", redisKey, ex.getMessage());
        }

        // L2: Tenant Database Cache
        try {
            Optional<AiLocalizedContent> dbRow = repository.findByEntityTypeAndEntityIdAndContentHashAndLocale(
                    entityType, entityId, contentHash, normLocale);
            if (dbRow.isPresent()) {
                String jsonStr = dbRow.get().getLocalizedJson();
                try {
                    redisService.set(redisKey, jsonStr, REDIS_TTL);
                } catch (Exception ex) {
                    log.warn("Redis write failed for key {}: {}", redisKey, ex.getMessage());
                }
                return Optional.of(mapper.readTree(jsonStr));
            }
        } catch (Exception ex) {
            log.warn("DB lookup failed for {}:{} loc {}: {}", entityType, entityId, normLocale, ex.getMessage());
        }

        return Optional.empty();
    }

    @Transactional
    public AiLocalizeResponse localize(
            String entityType,
            Long entityId,
            String targetLocale,
            String sourceLocale,
            JsonNode content) {
        String normTarget = (targetLocale == null || targetLocale.isBlank()) ? "vi" : targetLocale.trim().toLowerCase();
        String normSource = (sourceLocale == null || sourceLocale.isBlank()) ? "vi" : sourceLocale.trim().toLowerCase();

        String hash = computeContentHash(content);

        // Same language: immediate return
        if (normTarget.equalsIgnoreCase(normSource) || content == null || content.isNull() || content.isEmpty()) {
            return new AiLocalizeResponse(entityType, entityId, normTarget, normSource, hash, content, true);
        }

        // Cache hit (Redis or DB)
        Optional<JsonNode> cached = getCached(entityType, entityId, hash, normTarget);
        if (cached.isPresent()) {
            return new AiLocalizeResponse(entityType, entityId, normTarget, normSource, hash, cached.get(), true);
        }

        // Translate via AI
        JsonNode localizedResult = executeAiTranslation(normSource, normTarget, content);
        if (localizedResult != null && !localizedResult.isNull() && !localizedResult.isEmpty()) {
            // Persist to DB
            try {
                String jsonString = mapper.writeValueAsString(localizedResult);
                AiLocalizedContent record = repository.findByEntityTypeAndEntityIdAndContentHashAndLocale(
                                entityType, entityId, hash, normTarget)
                        .orElseGet(() -> AiLocalizedContent.builder()
                                .entityType(entityType)
                                .entityId(entityId)
                                .contentHash(hash)
                                .locale(normTarget)
                                .sourceLocale(normSource)
                                .build());
                record.setLocalizedJson(jsonString);
                record.setSourceLocale(normSource);
                repository.save(record);

                // Write to Redis
                String tenant = TenantContext.getCurrentTenant();
                String redisKey = buildRedisKey(tenant, entityType, entityId, normTarget, hash);
                redisService.set(redisKey, jsonString, REDIS_TTL);
            } catch (Exception ex) {
                log.error("Failed to persist localized AI content for {}:{} locale {}: {}",
                        entityType, entityId, normTarget, ex.getMessage());
            }
            return new AiLocalizeResponse(entityType, entityId, normTarget, normSource, hash, localizedResult, false);
        }

        // Fallback: Return original content if AI failed or quota exhausted, no crashing UI
        log.warn("AI localization fallback to original content for {}:{} locale {}", entityType, entityId, normTarget);
        return new AiLocalizeResponse(entityType, entityId, normTarget, normSource, hash, content, false);
    }

    private JsonNode executeAiTranslation(String sourceLocale, String targetLocale, JsonNode content) {
        String systemInstruction = String.format(SYSTEM_INSTRUCTION_TEMPLATE, sourceLocale, targetLocale, targetLocale);
        try {
            String promptText = mapper.writeValueAsString(content);
            String aiResponseJson = aiClient.completeForTask("AI_TRANSLATION", systemInstruction, promptText).json();
            if (aiResponseJson != null && !aiResponseJson.isBlank()) {
                // Strip potential markdown backticks if AI outputs them
                String clean = aiResponseJson.trim();
                if (clean.startsWith("```json")) {
                    clean = clean.substring(7);
                } else if (clean.startsWith("```")) {
                    clean = clean.substring(3);
                }
                if (clean.endsWith("```")) {
                    clean = clean.substring(0, clean.length() - 3);
                }
                return mapper.readTree(clean.trim());
            }
        } catch (Exception ex) {
            log.warn("AI translation call failed ({} -> {}): {}", sourceLocale, targetLocale, ex.getMessage());
        }
        return null;
    }
}
