package com.smarthire.master.analytics.service;

import com.smarthire.domain.master.entity.AiModelConfig;
import com.smarthire.domain.master.entity.AiProviderKey;
import com.smarthire.domain.master.entity.ConsultationRequest;
import com.smarthire.domain.master.entity.Contract;
import com.smarthire.domain.master.entity.Invoice;
import com.smarthire.domain.master.entity.SubscriptionPlan;
import com.smarthire.domain.master.entity.TenantAiUsageDaily;
import com.smarthire.domain.master.entity.TenantInfo;
import com.smarthire.domain.master.entity.TenantSubscription;
import com.smarthire.domain.master.entity.TenantUsageDaily;
import com.smarthire.domain.master.repository.*;
import com.smarthire.master.analytics.dto.AiQuotaUsageResponse;
import com.smarthire.master.analytics.dto.ChartDataPoint;
import com.smarthire.master.analytics.dto.RevenueAnalyticsResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.IsoFields;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MasterAnalyticsService {

    private final InvoiceRepository invoiceRepository;
    private final TenantInfoRepository tenantInfoRepository;
    private final TenantSubscriptionRepository subscriptionRepository;
    private final SubscriptionPlanRepository planRepository;
    private final TenantUsageDailyRepository usageDailyRepository;

    @Autowired(required = false)
    private TenantAiUsageDailyRepository aiUsageDailyRepository;

    @Autowired(required = false)
    private ConsultationRequestRepository consultationRequestRepository;

    @Autowired(required = false)
    private ContractRepository contractRepository;

    @Autowired(required = false)
    private AiModelConfigRepository aiModelConfigRepository;

    @Autowired(required = false)
    private AiProviderKeyRepository aiProviderKeyRepository;

    @Autowired(required = false)
    private PlatformAuditLogRepository auditLogRepository;

    @Transactional(transactionManager = "masterTransactionManager", readOnly = true)
    public RevenueAnalyticsResponse getRevenueAnalytics(LocalDateTime startDate, LocalDateTime endDate, String groupBy) {
        if (startDate == null) startDate = LocalDateTime.now().minusMonths(11).withDayOfMonth(1).withHour(0).withMinute(0);
        if (endDate == null) endDate = LocalDateTime.now();
        if (groupBy == null || groupBy.isEmpty()) groupBy = "MONTH";

        List<Invoice> invoices = invoiceRepository.findByStatusAndPaidAtBetweenOrderByPaidAtAsc("PAID", startDate, endDate);

        BigDecimal totalRevenue = invoices.stream()
                .map(Invoice::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Calculate real invoice breakdown across all invoices in Master DB
        List<Invoice> allInvoices = invoiceRepository.findAll();
        long paidInvoicesCount = 0;
        BigDecimal paidInvoicesAmount = BigDecimal.ZERO;
        long pendingInvoicesCount = 0;
        BigDecimal pendingInvoicesAmount = BigDecimal.ZERO;
        long overdueInvoicesCount = 0;
        BigDecimal overdueInvoicesAmount = BigDecimal.ZERO;
        LocalDateTime now = LocalDateTime.now();

        for (Invoice inv : allInvoices) {
            BigDecimal amt = inv.getAmount() != null ? inv.getAmount() : BigDecimal.ZERO;
            String st = inv.getStatus() != null ? inv.getStatus().toUpperCase() : "";
            if ("PAID".equals(st)) {
                paidInvoicesCount++;
                paidInvoicesAmount = paidInvoicesAmount.add(amt);
            } else if ("OVERDUE".equals(st) || ("PENDING".equals(st) && inv.getDueDate() != null && inv.getDueDate().isBefore(now))) {
                overdueInvoicesCount++;
                overdueInvoicesAmount = overdueInvoicesAmount.add(amt);
            } else if ("PENDING".equals(st)) {
                pendingInvoicesCount++;
                pendingInvoicesAmount = pendingInvoicesAmount.add(amt);
            }
        }

        // Calculate plan distribution & ARR/MRR from active annual subscriptions
        Map<String, Long> planDistribution = new HashMap<>();
        List<TenantSubscription> activeSubs = subscriptionRepository.findAll().stream()
                .filter(s -> "ACTIVE".equals(s.getStatus()))
                .collect(Collectors.toList());

        Map<Long, SubscriptionPlan> planObjMap = planRepository.findAll().stream()
                .collect(Collectors.toMap(SubscriptionPlan::getId, p -> p, (a, b) -> a));

        BigDecimal arr = BigDecimal.ZERO;
        for (TenantSubscription sub : activeSubs) {
            SubscriptionPlan plan = planObjMap.get(sub.getPlanId());
            String planCode = sub.getPlanCodeSnapshot() != null
                    ? sub.getPlanCodeSnapshot()
                    : (plan != null ? plan.getCode() : "UNKNOWN");
            planDistribution.put(planCode, planDistribution.getOrDefault(planCode, 0L) + 1);

            BigDecimal subYearly = sub.getContractedPriceYearly();
            if (subYearly == null && plan != null) {
                subYearly = plan.getPriceYearly();
            }
            if (subYearly != null && subYearly.compareTo(BigDecimal.ZERO) > 0) {
                arr = arr.add(subYearly);
            }
        }

        BigDecimal mrr = arr.divide(BigDecimal.valueOf(12), 0, RoundingMode.HALF_UP);

        // Calculate dynamic month-over-month revenue growth rate
        LocalDateTime currentMonthStart = now.withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0);
        LocalDateTime prevMonthStart = currentMonthStart.minusMonths(1);
        BigDecimal currentMonthRev = invoiceRepository.findByStatusAndPaidAtBetweenOrderByPaidAtAsc("PAID", currentMonthStart, now)
                .stream().map(Invoice::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal prevMonthRev = invoiceRepository.findByStatusAndPaidAtBetweenOrderByPaidAtAsc("PAID", prevMonthStart, currentMonthStart.minusSeconds(1))
                .stream().map(Invoice::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);

        String growthRate;
        if (prevMonthRev.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal pct = currentMonthRev.subtract(prevMonthRev)
                    .multiply(BigDecimal.valueOf(100))
                    .divide(prevMonthRev, 1, RoundingMode.HALF_UP);
            growthRate = (pct.compareTo(BigDecimal.ZERO) >= 0 ? "+" : "") + pct.toPlainString() + "%";
        } else if (currentMonthRev.compareTo(BigDecimal.ZERO) > 0) {
            growthRate = "+100.0%";
        } else {
            growthRate = "0.0%";
        }

        List<TenantInfo> allTenants = tenantInfoRepository.findAll().stream()
                .filter(t -> !t.isDeleted())
                .collect(Collectors.toList());
        long activeTenants = allTenants.stream().filter(t -> "ACTIVE".equals(t.getStatus())).count();
        long totalTenants = allTenants.size();
        long newTenantsThisMonth = allTenants.stream()
                .filter(t -> t.getCreatedAt() != null && !t.getCreatedAt().isBefore(currentMonthStart))
                .count();

        BigDecimal arpa = activeTenants > 0
                ? arr.divide(BigDecimal.valueOf(activeTenants), 0, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        // Calculate Lead & Contract operational metrics
        long openLeadsCount = 0;
        long conversionRatePercent = 0;
        if (consultationRequestRepository != null) {
            List<ConsultationRequest> leads = consultationRequestRepository.findAll();
            openLeadsCount = leads.stream()
                    .filter(l -> "PENDING".equalsIgnoreCase(l.getStatus()) || "CONTACTED".equalsIgnoreCase(l.getStatus()))
                    .count();
            long provisionedLeads = leads.stream()
                    .filter(l -> "PROVISIONED".equalsIgnoreCase(l.getStatus()))
                    .count();
            if (!leads.isEmpty()) {
                conversionRatePercent = Math.round((provisionedLeads * 100.0) / leads.size());
            }
        }

        long pendingContractsCount = 0;
        if (contractRepository != null) {
            List<Contract> contracts = contractRepository.findAll();
            pendingContractsCount = contracts.stream()
                    .filter(c -> "DRAFT".equalsIgnoreCase(c.getStatus()) || "PENDING_SIGNATURE".equalsIgnoreCase(c.getStatus()))
                    .count();
        }

        // Group by
        Map<String, BigDecimal> groupedRevenue = new LinkedHashMap<>();
        for (Invoice inv : invoices) {
            String key = formatGroupKey(inv.getPaidAt(), groupBy);
            groupedRevenue.put(key, groupedRevenue.getOrDefault(key, BigDecimal.ZERO).add(inv.getAmount()));
        }

        List<ChartDataPoint> trend = groupedRevenue.entrySet().stream()
                .map(e -> new ChartDataPoint(e.getKey(), e.getValue()))
                .collect(Collectors.toList());

        return RevenueAnalyticsResponse.builder()
                .totalRevenue(totalRevenue)
                .mrr(mrr)
                .arr(arr)
                .arpa(arpa)
                .activeTenants(activeTenants)
                .totalTenants(totalTenants)
                .newTenantsThisMonth(newTenantsThisMonth)
                .growthRate(growthRate)
                .paidInvoicesCount(paidInvoicesCount)
                .paidInvoicesAmount(paidInvoicesAmount)
                .pendingInvoicesCount(pendingInvoicesCount)
                .pendingInvoicesAmount(pendingInvoicesAmount)
                .overdueInvoicesCount(overdueInvoicesCount)
                .overdueInvoicesAmount(overdueInvoicesAmount)
                .openLeadsCount(openLeadsCount)
                .conversionRatePercent(conversionRatePercent)
                .pendingContractsCount(pendingContractsCount)
                .planDistribution(planDistribution)
                .revenueTrend(trend)
                .build();
    }

    @Transactional(transactionManager = "masterTransactionManager", readOnly = true)
    public AiQuotaUsageResponse getAiQuotaUsage(LocalDate startDate, LocalDate endDate) {
        if (startDate == null) startDate = LocalDate.now().minusDays(30);
        if (endDate == null) endDate = LocalDate.now();

        List<TenantUsageDaily> usages = usageDailyRepository.findByUsageDateBetweenOrderByUsageDateAsc(startDate, endDate);

        long totalCvParses = 0;
        long totalVoiceSeconds = 0;
        long totalTokens = 0;

        Map<String, Long> groupedUsage = new LinkedHashMap<>();
        Map<Long, Long> tenantCvUsedMap = new HashMap<>();
        Map<Long, Long> tenantVoiceSecUsedMap = new HashMap<>();

        for (TenantUsageDaily u : usages) {
            long cvCount = u.getCvParsesCount() != null ? u.getCvParsesCount() : 0L;
            long voiceSec = u.getAiVoiceSeconds() != null ? u.getAiVoiceSeconds() : 0L;
            long tokens = u.getAiTokensConsumed() != null ? u.getAiTokensConsumed() : 0L;

            totalCvParses += cvCount;
            totalVoiceSeconds += voiceSec;
            totalTokens += tokens;

            tenantCvUsedMap.merge(u.getTenantId(), cvCount, Long::sum);
            tenantVoiceSecUsedMap.merge(u.getTenantId(), voiceSec, Long::sum);

            String dateKey = u.getUsageDate().toString();
            groupedUsage.put(dateKey, groupedUsage.getOrDefault(dateKey, 0L) + tokens);
        }

        // Also aggregate granular AI usage from tenant_ai_usage_daily (V25)
        BigDecimal totalCostUsd = BigDecimal.ZERO;
        long totalAiRequests = 0;
        long failedAiRequests = 0;
        long totalLatencyMs = 0;

        if (aiUsageDailyRepository != null) {
            List<TenantAiUsageDaily> aiUsages = aiUsageDailyRepository.findByUsageDateBetweenOrderByUsageDateAsc(startDate, endDate);
            long aiTableTokens = 0;
            long aiTableCvParses = 0;
            for (TenantAiUsageDaily au : aiUsages) {
                long promptTok = au.getTotalPromptTokens() != null ? au.getTotalPromptTokens() : 0L;
                long compTok = au.getTotalCompletionTokens() != null ? au.getTotalCompletionTokens() : 0L;
                long rowTokens = promptTok + compTok;
                aiTableTokens += rowTokens;

                int reqs = au.getTotalRequests() != null ? au.getTotalRequests() : 0;
                int fails = au.getFailedRequests() != null ? au.getFailedRequests() : 0;
                long lat = au.getTotalLatencyMs() != null ? au.getTotalLatencyMs() : 0L;

                totalAiRequests += reqs;
                failedAiRequests += fails;
                totalLatencyMs += lat;

                if (au.getEstimatedCostUsd() != null) {
                    totalCostUsd = totalCostUsd.add(au.getEstimatedCostUsd());
                }
                if ("CV_PARSING".equalsIgnoreCase(au.getTaskType())) {
                    aiTableCvParses += Math.max(0, reqs - fails);
                    tenantCvUsedMap.merge(au.getTenantId(), (long) Math.max(0, reqs - fails), Long::sum);
                }

                String dateKey = au.getUsageDate().toString();
                if (!groupedUsage.containsKey(dateKey) || groupedUsage.get(dateKey) == 0L) {
                    groupedUsage.put(dateKey, groupedUsage.getOrDefault(dateKey, 0L) + rowTokens);
                }
            }
            if (totalTokens == 0 && aiTableTokens > 0) {
                totalTokens = aiTableTokens;
            }
            if (totalCvParses == 0 && aiTableCvParses > 0) {
                totalCvParses = aiTableCvParses;
            }
        }

        // Compute total quota limits & near-quota tenant count (>= 80%) across active subscriptions
        List<TenantSubscription> activeSubs = subscriptionRepository.findAll().stream()
                .filter(s -> "ACTIVE".equals(s.getStatus()))
                .collect(Collectors.toList());
        Map<Long, SubscriptionPlan> planObjMap = planRepository.findAll().stream()
                .collect(Collectors.toMap(SubscriptionPlan::getId, p -> p, (a, b) -> a));

        long totalCvParsesLimit = 0;
        long totalVoiceHoursLimit = 0;
        long nearQuotaTenantsCount = 0;

        for (TenantSubscription sub : activeSubs) {
            SubscriptionPlan plan = planObjMap.get(sub.getPlanId());
            Integer maxCv = sub.getSnapshotMaxCvParses() != null
                    ? sub.getSnapshotMaxCvParses()
                    : (plan != null ? plan.getMaxCvParses() : 500);
            Integer maxVoiceHours = sub.getSnapshotMaxAiInterviewHours() != null
                    ? sub.getSnapshotMaxAiInterviewHours()
                    : (plan != null ? plan.getMaxAiInterviewHours() : 10);

            long effectiveCvLimit = (maxCv == null || maxCv < 0) ? 10000L : maxCv;
            long effectiveVoiceHoursLimit = (maxVoiceHours == null || maxVoiceHours < 0) ? 200L : maxVoiceHours;

            totalCvParsesLimit += effectiveCvLimit;
            totalVoiceHoursLimit += effectiveVoiceHoursLimit;

            long usedCv = tenantCvUsedMap.getOrDefault(sub.getTenantId(), 0L);
            long usedVoiceSec = tenantVoiceSecUsedMap.getOrDefault(sub.getTenantId(), 0L);

            boolean nearCv = maxCv != null && maxCv > 0 && (usedCv * 100.0 / maxCv) >= 80.0;
            boolean nearVoice = maxVoiceHours != null && maxVoiceHours > 0
                    && (usedVoiceSec * 100.0 / (maxVoiceHours * 3600.0)) >= 80.0;
            if (nearCv || nearVoice) {
                nearQuotaTenantsCount++;
            }
        }

        if (totalCvParsesLimit <= 0) totalCvParsesLimit = 1000L;
        if (totalVoiceHoursLimit <= 0) totalVoiceHoursLimit = 50L;

        double totalVoiceHoursUsed = Math.round((totalVoiceSeconds / 3600.0) * 10.0) / 10.0;

        // Convert AI cost to VND (1 USD = 25,000 VND; fallback to token estimate if cost USD is 0)
        BigDecimal estimatedAiCostVnd = totalCostUsd.multiply(BigDecimal.valueOf(25000)).setScale(0, RoundingMode.HALF_UP);
        if (estimatedAiCostVnd.compareTo(BigDecimal.ZERO) == 0 && totalTokens > 0) {
            // Standard Gemini Flash average ~ 5 VND per 1,000 tokens
            estimatedAiCostVnd = BigDecimal.valueOf(Math.max(1000L, (totalTokens * 5L) / 1000L));
        }

        double apiSuccessRate = totalAiRequests > 0
                ? Math.round(((totalAiRequests - failedAiRequests) * 10000.0) / totalAiRequests) / 100.0
                : 100.0;
        long averageLatencyMs = totalAiRequests > 0
                ? Math.round((double) totalLatencyMs / totalAiRequests)
                : 0L;

        List<ChartDataPoint> trend = groupedUsage.entrySet().stream()
                .map(e -> new ChartDataPoint(e.getKey(), BigDecimal.valueOf(e.getValue())))
                .collect(Collectors.toList());

        List<String> activeModels = List.of("gemini-2.5-flash", "gemini-2.0-flash");
        if (aiModelConfigRepository != null) {
            List<String> dbModels = aiModelConfigRepository.findAll().stream()
                    .filter(c -> !Boolean.FALSE.equals(c.getIsActive()))
                    .map(c -> c.getProvider() + ": " + c.getModelName())
                    .distinct()
                    .collect(Collectors.toList());
            if (!dbModels.isEmpty()) {
                activeModels = dbModels;
            }
        }

        String systemHealth = "HEALTHY";
        if (aiProviderKeyRepository != null) {
            List<AiProviderKey> keys = aiProviderKeyRepository.findAll();
            boolean hasRateLimited = keys.stream()
                    .anyMatch(k -> k.getStatus() != null && k.getStatus().toUpperCase().contains("RATE_LIMITED"));
            if (hasRateLimited) {
                systemHealth = "DEGRADED";
            }
        }

        return AiQuotaUsageResponse.builder()
                .totalCvParsesUsed(totalCvParses)
                .totalVoiceSecondsUsed(totalVoiceSeconds)
                .totalVoiceHoursUsed(totalVoiceHoursUsed)
                .totalCvParsesLimit(totalCvParsesLimit)
                .totalVoiceHoursLimit(totalVoiceHoursLimit)
                .totalTokensConsumed(totalTokens)
                .nearQuotaTenantsCount(nearQuotaTenantsCount)
                .estimatedAiCostVnd(estimatedAiCostVnd)
                .apiSuccessRate(apiSuccessRate)
                .averageLatencyMs(averageLatencyMs)
                .systemHealth(systemHealth)
                .activeModels(activeModels)
                .usageTrend(trend)
                .build();
    }

    @Transactional(transactionManager = "masterTransactionManager", readOnly = true)
    public List<Map<String, Object>> getSystemAuditLogs() {
        if (auditLogRepository == null) {
            return List.of();
        }
        return auditLogRepository.findTop50ByOrderByCreatedAtDesc().stream()
                .map(log -> {
                    Map<String, Object> item = new LinkedHashMap<>();
                    item.put("id", log.getId());
                    item.put("tenantCode", log.getTenantCode() != null ? log.getTenantCode() : "MASTER");
                    item.put("platformUserId", log.getPlatformUserId());
                    item.put("action", log.getAction());
                    item.put("level", log.getLevel() != null ? log.getLevel() : "INFO");
                    item.put("description", log.getDescription());
                    item.put("ipAddress", log.getIpAddress());
                    item.put("metadataJson", log.getMetadataJson());
                    item.put("timestamp", log.getCreatedAt() != null ? log.getCreatedAt().toString() : null);
                    return item;
                })
                .collect(Collectors.toList());
    }

    private String formatGroupKey(LocalDateTime date, String groupBy) {
        if ("YEAR".equalsIgnoreCase(groupBy)) {
            return String.valueOf(date.getYear());
        } else if ("WEEK".equalsIgnoreCase(groupBy)) {
            return date.getYear() + "-W" + date.get(IsoFields.WEEK_OF_WEEK_BASED_YEAR);
        }
        // Default to MONTH
        return date.format(DateTimeFormatter.ofPattern("yyyy-MM"));
    }
}
