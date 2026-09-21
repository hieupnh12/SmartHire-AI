package com.smarthire.master.analytics.service;

import com.smarthire.domain.master.entity.Invoice;
import com.smarthire.domain.master.entity.SubscriptionPlan;
import com.smarthire.domain.master.entity.TenantSubscription;
import com.smarthire.domain.master.entity.TenantUsageDaily;
import com.smarthire.domain.master.repository.*;
import com.smarthire.master.analytics.dto.AiQuotaUsageResponse;
import com.smarthire.master.analytics.dto.ChartDataPoint;
import com.smarthire.master.analytics.dto.RevenueAnalyticsResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
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

    @Transactional(readOnly = true)
    public RevenueAnalyticsResponse getRevenueAnalytics(LocalDateTime startDate, LocalDateTime endDate, String groupBy) {
        if (startDate == null) startDate = LocalDateTime.now().minusMonths(11).withDayOfMonth(1).withHour(0).withMinute(0);
        if (endDate == null) endDate = LocalDateTime.now();
        if (groupBy == null || groupBy.isEmpty()) groupBy = "MONTH";

        List<Invoice> invoices = invoiceRepository.findByStatusAndPaidAtBetweenOrderByPaidAtAsc("PAID", startDate, endDate);

        BigDecimal totalRevenue = invoices.stream()
                .map(Invoice::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Calculate MRR (sum of amounts in the current month)
        LocalDateTime currentMonthStart = LocalDateTime.now().withDayOfMonth(1).withHour(0).withMinute(0);
        BigDecimal mrr = invoiceRepository.findByStatusAndPaidAtBetweenOrderByPaidAtAsc("PAID", currentMonthStart, LocalDateTime.now())
                .stream().map(Invoice::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal arr = mrr.multiply(BigDecimal.valueOf(12));

        long activeTenants = tenantInfoRepository.countByStatus("ACTIVE");
        long totalTenants = tenantInfoRepository.count();

        // Calculate plan distribution
        Map<String, Long> planDistribution = new HashMap<>();
        List<TenantSubscription> activeSubs = subscriptionRepository.findAll().stream()
                .filter(s -> "ACTIVE".equals(s.getStatus()))
                .collect(Collectors.toList());
        
        Map<Long, String> planMap = planRepository.findAll().stream()
                .collect(Collectors.toMap(SubscriptionPlan::getId, SubscriptionPlan::getCode));

        for (TenantSubscription sub : activeSubs) {
            String planCode = planMap.getOrDefault(sub.getPlanId(), "UNKNOWN");
            planDistribution.put(planCode, planDistribution.getOrDefault(planCode, 0L) + 1);
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
                .activeTenants(activeTenants)
                .totalTenants(totalTenants)
                .growthRate("+12.5%") // Placeholder logic for growth rate
                .planDistribution(planDistribution)
                .revenueTrend(trend)
                .build();
    }

    @Transactional(readOnly = true)
    public AiQuotaUsageResponse getAiQuotaUsage(LocalDate startDate, LocalDate endDate) {
        if (startDate == null) startDate = LocalDate.now().minusDays(30);
        if (endDate == null) endDate = LocalDate.now();

        List<TenantUsageDaily> usages = usageDailyRepository.findByUsageDateBetweenOrderByUsageDateAsc(startDate, endDate);

        long totalCvParses = 0;
        long totalVoiceSeconds = 0;
        long totalTokens = 0;

        Map<String, Long> groupedUsage = new LinkedHashMap<>();

        for (TenantUsageDaily u : usages) {
            totalCvParses += u.getCvParsesCount();
            totalVoiceSeconds += u.getAiVoiceSeconds();
            totalTokens += u.getAiTokensConsumed();

            String dateKey = u.getUsageDate().toString();
            groupedUsage.put(dateKey, groupedUsage.getOrDefault(dateKey, 0L) + u.getAiTokensConsumed());
        }

        List<ChartDataPoint> trend = groupedUsage.entrySet().stream()
                .map(e -> new ChartDataPoint(e.getKey(), BigDecimal.valueOf(e.getValue())))
                .collect(Collectors.toList());

        return AiQuotaUsageResponse.builder()
                .totalCvParsesUsed(totalCvParses)
                .totalVoiceSecondsUsed(totalVoiceSeconds)
                .totalTokensConsumed(totalTokens)
                .systemHealth("HEALTHY")
                .activeModels(List.of("Gemini 1.5 Pro", "Whisper STT", "FastText Matching"))
                .usageTrend(trend)
                .build();
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
