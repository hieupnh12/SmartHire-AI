package com.smarthire.config.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.smarthire.domain.master.entity.AiModelPricing;
import com.smarthire.domain.master.entity.TenantAiUsageDaily;
import com.smarthire.domain.master.entity.TenantInfo;
import com.smarthire.domain.master.entity.TenantUsageDaily;
import com.smarthire.domain.master.repository.AiModelPricingRepository;
import com.smarthire.domain.master.repository.TenantAiUsageDailyRepository;
import com.smarthire.domain.master.repository.TenantInfoRepository;
import com.smarthire.domain.master.repository.TenantUsageDailyRepository;
import com.smarthire.multitenancy.context.TenantContext;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@Service
@Slf4j
public class AiUsageMeteringService {

    private static final BigDecimal ONE_MILLION = BigDecimal.valueOf(1_000_000L);
    private static final BigDecimal DEFAULT_INPUT_PRICE_PER_1M = new BigDecimal("0.1500");
    private static final BigDecimal DEFAULT_OUTPUT_PRICE_PER_1M = new BigDecimal("0.6000");

    private final TenantInfoRepository tenantInfoRepository;
    private final TenantAiUsageDailyRepository aiUsageDailyRepository;
    private final TenantUsageDailyRepository tenantUsageDailyRepository;
    private final AiModelPricingRepository modelPricingRepository;
    private TransactionTemplate transactionTemplate;
    private AiRateLimiterService rateLimiterService;

    public AiUsageMeteringService(
            TenantInfoRepository tenantInfoRepository,
            TenantAiUsageDailyRepository aiUsageDailyRepository,
            TenantUsageDailyRepository tenantUsageDailyRepository,
            AiModelPricingRepository modelPricingRepository,
            TransactionTemplate transactionTemplate) {
        this.tenantInfoRepository = tenantInfoRepository;
        this.aiUsageDailyRepository = aiUsageDailyRepository;
        this.tenantUsageDailyRepository = tenantUsageDailyRepository;
        this.modelPricingRepository = modelPricingRepository;
        this.transactionTemplate = transactionTemplate;
    }

    @Autowired(required = false)
    public void setMasterTransactionManager(
            @Qualifier("masterTransactionManager") PlatformTransactionManager masterTransactionManager) {
        if (masterTransactionManager != null) {
            this.transactionTemplate = new TransactionTemplate(masterTransactionManager);
        }
    }

    @Autowired(required = false)
    public void setRateLimiterService(AiRateLimiterService rateLimiterService) {
        this.rateLimiterService = rateLimiterService;
    }

    /**
     * Captures the current tenant from {@link TenantContext} on the caller thread and asynchronously
     * records token consumption, latency, and estimated USD cost in the Master DB.
     */
    public void recordUsageAsync(
            String taskType,
            String provider,
            String modelName,
            long promptTokens,
            long completionTokens,
            long latencyMs,
            boolean success) {
        String tenantCode = TenantContext.getCurrentTenant();
        recordUsageAsync(tenantCode, taskType, provider, modelName, promptTokens, completionTokens, latencyMs, success);
    }

    public void recordUsageAsync(
            String tenantCode,
            String taskType,
            String provider,
            String modelName,
            long promptTokens,
            long completionTokens,
            long latencyMs,
            boolean success) {
        if (tenantCode == null || tenantCode.isBlank() || "smarthire_master".equalsIgnoreCase(tenantCode)) {
            return;
        }
        long totalTokens = Math.max(0L, promptTokens) + Math.max(0L, completionTokens);
        if (rateLimiterService != null && totalTokens > 0L) {
            rateLimiterService.recordTokensConsumed(tenantCode, totalTokens);
        }
        CompletableFuture.runAsync(() -> recordUsageSync(
                tenantCode, taskType, provider, modelName, promptTokens, completionTokens, latencyMs, success));
    }

    public void recordUsageSync(
            String tenantCode,
            String taskType,
            String provider,
            String modelName,
            long promptTokens,
            long completionTokens,
            long latencyMs,
            boolean success) {
        if (tenantCode == null || tenantCode.isBlank() || "smarthire_master".equalsIgnoreCase(tenantCode)) {
            return;
        }
        try {
            Optional<TenantInfo> tenantOpt = tenantInfoRepository.findByCode(tenantCode)
                    .or(() -> tenantInfoRepository.findBySubdomain(tenantCode));
            if (tenantOpt.isEmpty()) {
                return;
            }
            final Long tenantId = tenantOpt.get().getId();
            final LocalDate today = LocalDate.now();
            final String normTask = (taskType == null || taskType.isBlank()) ? "CV_PARSING" : taskType.trim().toUpperCase();
            final String normProvider = (provider == null || provider.isBlank()) ? "GEMINI" : provider.trim().toUpperCase();
            final String normModel = (modelName == null || modelName.isBlank()) ? "gemini-2.5-flash" : modelName.trim();
            final long safePrompt = Math.max(0L, promptTokens);
            final long safeCompletion = Math.max(0L, completionTokens);
            final long safeLatency = Math.max(0L, latencyMs);
            final BigDecimal callCostUsd = calculateCostUsd(normProvider, normModel, safePrompt, safeCompletion);

            Runnable dbUpdate = () -> {
                TenantAiUsageDaily record = aiUsageDailyRepository
                        .findByTenantIdAndUsageDateAndTaskTypeAndProviderAndModelName(
                                tenantId, today, normTask, normProvider, normModel)
                        .orElseGet(() -> TenantAiUsageDaily.builder()
                                .tenantId(tenantId)
                                .usageDate(today)
                                .taskType(normTask)
                                .provider(normProvider)
                                .modelName(normModel)
                                .totalRequests(0)
                                .failedRequests(0)
                                .totalPromptTokens(0L)
                                .totalCompletionTokens(0L)
                                .estimatedCostUsd(BigDecimal.ZERO)
                                .totalLatencyMs(0L)
                                .build());

                record.setTotalRequests((record.getTotalRequests() != null ? record.getTotalRequests() : 0) + 1);
                if (!success) {
                    record.setFailedRequests((record.getFailedRequests() != null ? record.getFailedRequests() : 0) + 1);
                }
                record.setTotalPromptTokens((record.getTotalPromptTokens() != null ? record.getTotalPromptTokens() : 0L) + safePrompt);
                record.setTotalCompletionTokens((record.getTotalCompletionTokens() != null ? record.getTotalCompletionTokens() : 0L) + safeCompletion);
                BigDecimal prevCost = record.getEstimatedCostUsd() != null ? record.getEstimatedCostUsd() : BigDecimal.ZERO;
                record.setEstimatedCostUsd(prevCost.add(callCostUsd));
                record.setTotalLatencyMs((record.getTotalLatencyMs() != null ? record.getTotalLatencyMs() : 0L) + safeLatency);
                aiUsageDailyRepository.save(record);

                long totalCallTokens = safePrompt + safeCompletion;
                if (totalCallTokens > 0) {
                    TenantUsageDaily daily = tenantUsageDailyRepository.findByTenantIdAndUsageDate(tenantId, today)
                            .orElseGet(() -> TenantUsageDaily.builder()
                                    .tenantId(tenantId)
                                    .usageDate(today)
                                    .build());
                    long prevTokens = daily.getAiTokensConsumed() != null ? daily.getAiTokensConsumed() : 0L;
                    daily.setAiTokensConsumed(prevTokens + totalCallTokens);
                    tenantUsageDailyRepository.save(daily);
                }
            };

            if (transactionTemplate != null) {
                transactionTemplate.executeWithoutResult(status -> dbUpdate.run());
            } else {
                dbUpdate.run();
            }
        } catch (Exception ex) {
            log.warn("Failed to record AI metering for tenant {} task {}: {}", tenantCode, taskType, ex.getMessage());
        }
    }

    public BigDecimal calculateCostUsd(String provider, String modelName, long promptTokens, long completionTokens) {
        if (promptTokens <= 0 && completionTokens <= 0) {
            return BigDecimal.ZERO.setScale(6, RoundingMode.HALF_UP);
        }
        BigDecimal inputPrice = DEFAULT_INPUT_PRICE_PER_1M;
        BigDecimal outputPrice = DEFAULT_OUTPUT_PRICE_PER_1M;

        if (modelPricingRepository != null && provider != null && modelName != null) {
            Optional<AiModelPricing> pricingOpt = modelPricingRepository
                    .findByProviderIgnoreCaseAndModelNameIgnoreCase(provider.trim(), modelName.trim());
            if (pricingOpt.isPresent()) {
                AiModelPricing p = pricingOpt.get();
                if (p.getInputPricePer1mTokens() != null) inputPrice = p.getInputPricePer1mTokens();
                if (p.getOutputPricePer1mTokens() != null) outputPrice = p.getOutputPricePer1mTokens();
            } else {
                String lowerModel = modelName.toLowerCase();
                if (lowerModel.contains("pro") || lowerModel.contains("gpt-4o") && !lowerModel.contains("mini")) {
                    inputPrice = new BigDecimal("1.2500");
                    outputPrice = new BigDecimal("5.0000");
                } else if (lowerModel.contains("sonnet")) {
                    inputPrice = new BigDecimal("3.0000");
                    outputPrice = new BigDecimal("15.0000");
                }
            }
        }

        BigDecimal inputCost = BigDecimal.valueOf(Math.max(0L, promptTokens))
                .multiply(inputPrice)
                .divide(ONE_MILLION, 6, RoundingMode.HALF_UP);
        BigDecimal outputCost = BigDecimal.valueOf(Math.max(0L, completionTokens))
                .multiply(outputPrice)
                .divide(ONE_MILLION, 6, RoundingMode.HALF_UP);
        return inputCost.add(outputCost).setScale(6, RoundingMode.HALF_UP);
    }

    /**
     * Extracts token counts from Gemini native response JSON (`usageMetadata`) or OpenAI-compatible JSON (`usage`).
     * Falls back to character-based estimation (~4 chars/token) if provider omits usage metadata.
     */
    public static long[] extractTokenUsage(JsonNode root, String fallbackInputText, String fallbackOutputText) {
        long promptTokens = 0L;
        long completionTokens = 0L;
        if (root != null) {
            JsonNode geminiUsage = root.path("usageMetadata");
            if (!geminiUsage.isMissingNode() && geminiUsage.isObject()) {
                promptTokens = geminiUsage.path("promptTokenCount").asLong(0L);
                completionTokens = geminiUsage.path("candidatesTokenCount").asLong(0L);
            }
            JsonNode openAiUsage = root.path("usage");
            if (promptTokens == 0L && completionTokens == 0L && !openAiUsage.isMissingNode() && openAiUsage.isObject()) {
                promptTokens = openAiUsage.path("prompt_tokens").asLong(0L);
                completionTokens = openAiUsage.path("completion_tokens").asLong(0L);
            }
        }
        if (promptTokens <= 0L && fallbackInputText != null && !fallbackInputText.isEmpty()) {
            promptTokens = Math.max(1L, fallbackInputText.length() / 4L);
        }
        if (completionTokens <= 0L && fallbackOutputText != null && !fallbackOutputText.isEmpty()) {
            completionTokens = Math.max(1L, fallbackOutputText.length() / 4L);
        }
        return new long[]{promptTokens, completionTokens};
    }
}
