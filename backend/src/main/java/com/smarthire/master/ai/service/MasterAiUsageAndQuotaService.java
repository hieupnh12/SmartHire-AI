package com.smarthire.master.ai.service;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.master.entity.PlatformAuditLog;
import com.smarthire.domain.master.entity.SubscriptionPlan;
import com.smarthire.domain.master.entity.TenantAiUsageDaily;
import com.smarthire.domain.master.entity.TenantInfo;
import com.smarthire.domain.master.entity.TenantSubscription;
import com.smarthire.domain.master.entity.TenantUsageDaily;
import com.smarthire.domain.master.repository.PlatformAuditLogRepository;
import com.smarthire.domain.master.repository.TenantAiUsageDailyRepository;
import com.smarthire.domain.master.repository.TenantInfoRepository;
import com.smarthire.domain.master.repository.TenantSubscriptionRepository;
import com.smarthire.domain.master.repository.TenantUsageDailyRepository;
import com.smarthire.config.ai.AiRateLimiterService;
import com.smarthire.master.ai.dto.AiRateLimitConfigDto;
import com.smarthire.master.ai.dto.AiUsageReportDto;
import com.smarthire.master.ai.dto.TenantAiQuotaDto;
import com.smarthire.master.ai.dto.TenantAiQuotaUpdateRequest;
import com.smarthire.multitenancy.quota.QuotaType;
import com.smarthire.multitenancy.quota.TenantQuotaRedisService;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class MasterAiUsageAndQuotaService {

    private static final BigDecimal FALLBACK_COST_PER_CV_USD = new BigDecimal("0.0025");
    private static final BigDecimal FALLBACK_COST_PER_INTERVIEW_SEC_USD = new BigDecimal("0.0004");

    private final TenantInfoRepository tenantInfoRepository;
    private final TenantSubscriptionRepository subscriptionRepository;
    private final TenantUsageDailyRepository usageDailyRepository;
    private final TenantAiUsageDailyRepository aiUsageDailyRepository;
    private final PlatformAuditLogRepository auditLogRepository;
    private final TenantQuotaRedisService quotaRedisService;
    private AiRateLimiterService rateLimiterService;

    @Autowired(required = false)
    public void setRateLimiterService(AiRateLimiterService rateLimiterService) {
        this.rateLimiterService = rateLimiterService;
    }

    @Transactional(transactionManager = "masterTransactionManager", readOnly = true)
    public AiUsageReportDto getUsageReport(int months) {
        int safeMonths = (months <= 0 || months > 24) ? 6 : months;
        YearMonth currentYm = YearMonth.now();
        YearMonth startYm = currentYm.minusMonths(safeMonths - 1L);
        LocalDate startDate = startYm.atDay(1);
        LocalDate endDate = LocalDate.now();

        List<TenantInfo> tenants = tenantInfoRepository.findAll();
        Map<Long, TenantInfo> tenantMap = new HashMap<>();
        for (TenantInfo t : tenants) {
            tenantMap.put(t.getId(), t);
        }

        List<TenantUsageDaily> generalUsages = usageDailyRepository
                .findByUsageDateBetweenOrderByUsageDateAsc(startDate, endDate);
        List<TenantAiUsageDaily> detailedUsages = aiUsageDailyRepository
                .findByUsageDateBetweenOrderByUsageDateAsc(startDate, endDate);

        long totalCvParses = 0L;
        long totalVoiceSeconds = 0L;
        long totalTokensFromGeneral = 0L;

        Map<YearMonth, Long> monthCvMap = new LinkedHashMap<>();
        Map<YearMonth, Long> monthVoiceSecMap = new LinkedHashMap<>();
        Map<YearMonth, Long> monthReqMap = new LinkedHashMap<>();
        Map<YearMonth, Long> monthTokenMap = new LinkedHashMap<>();
        Map<YearMonth, BigDecimal> monthCostMap = new LinkedHashMap<>();

        for (int i = 0; i < safeMonths; i++) {
            YearMonth ym = startYm.plusMonths(i);
            monthCvMap.put(ym, 0L);
            monthVoiceSecMap.put(ym, 0L);
            monthReqMap.put(ym, 0L);
            monthTokenMap.put(ym, 0L);
            monthCostMap.put(ym, BigDecimal.ZERO);
        }

        Map<Long, Long> tenantCvMap = new HashMap<>();
        Map<Long, Long> tenantVoiceSecMap = new HashMap<>();
        Map<Long, Long> tenantPrevMonthTokens = new HashMap<>();
        Map<Long, Long> tenantCurrMonthTokens = new HashMap<>();
        YearMonth prevYm = currentYm.minusMonths(1);

        for (TenantUsageDaily u : generalUsages) {
            long cv = u.getCvParsesCount() != null ? u.getCvParsesCount() : 0L;
            long voiceSec = u.getAiVoiceSeconds() != null ? u.getAiVoiceSeconds() : 0L;
            long tokens = u.getAiTokensConsumed() != null ? u.getAiTokensConsumed() : 0L;

            totalCvParses += cv;
            totalVoiceSeconds += voiceSec;
            totalTokensFromGeneral += tokens;

            YearMonth ym = YearMonth.from(u.getUsageDate());
            if (monthCvMap.containsKey(ym)) {
                monthCvMap.put(ym, monthCvMap.get(ym) + cv);
                monthVoiceSecMap.put(ym, monthVoiceSecMap.get(ym) + voiceSec);
            }

            Long tid = u.getTenantId();
            tenantCvMap.put(tid, tenantCvMap.getOrDefault(tid, 0L) + cv);
            tenantVoiceSecMap.put(tid, tenantVoiceSecMap.getOrDefault(tid, 0L) + voiceSec);

            long activityScore = tokens > 0 ? tokens : (cv * 1500L + voiceSec * 25L);
            if (ym.equals(currentYm)) {
                tenantCurrMonthTokens.put(tid, tenantCurrMonthTokens.getOrDefault(tid, 0L) + activityScore);
            } else if (ym.equals(prevYm)) {
                tenantPrevMonthTokens.put(tid, tenantPrevMonthTokens.getOrDefault(tid, 0L) + activityScore);
            }
        }

        long totalAiRequests = 0L;
        long totalFailedRequests = 0L;
        long totalDetailedTokens = 0L;
        long totalLatencyMs = 0L;
        BigDecimal totalEstimatedCostUsd = BigDecimal.ZERO;

        Map<String, Long> taskRequestsMap = new LinkedHashMap<>();
        Map<String, Long> taskTokensMap = new LinkedHashMap<>();
        Map<String, BigDecimal> taskCostMap = new LinkedHashMap<>();
        for (String task : List.of("CV_PARSING", "INTERVIEW_GEN", "INTERVIEW_NLP", "MATCHING", "CODE_GRADING")) {
            taskRequestsMap.put(task, 0L);
            taskTokensMap.put(task, 0L);
            taskCostMap.put(task, BigDecimal.ZERO);
        }

        Map<Long, Long> tenantReqMap = new HashMap<>();
        Map<Long, Long> tenantTokenMap = new HashMap<>();
        Map<Long, BigDecimal> tenantCostMap = new HashMap<>();

        for (TenantAiUsageDaily d : detailedUsages) {
            long reqs = d.getTotalRequests() != null ? d.getTotalRequests() : 0L;
            long failed = d.getFailedRequests() != null ? d.getFailedRequests() : 0L;
            long prompt = d.getTotalPromptTokens() != null ? d.getTotalPromptTokens() : 0L;
            long completion = d.getTotalCompletionTokens() != null ? d.getTotalCompletionTokens() : 0L;
            long tokens = prompt + completion;
            long latency = d.getTotalLatencyMs() != null ? d.getTotalLatencyMs() : 0L;
            BigDecimal cost = d.getEstimatedCostUsd() != null ? d.getEstimatedCostUsd() : BigDecimal.ZERO;

            totalAiRequests += reqs;
            totalFailedRequests += failed;
            totalDetailedTokens += tokens;
            totalLatencyMs += latency;
            totalEstimatedCostUsd = totalEstimatedCostUsd.add(cost);

            String task = d.getTaskType() != null ? d.getTaskType().toUpperCase() : "CV_PARSING";
            taskRequestsMap.put(task, taskRequestsMap.getOrDefault(task, 0L) + reqs);
            taskTokensMap.put(task, taskTokensMap.getOrDefault(task, 0L) + tokens);
            taskCostMap.put(task, taskCostMap.getOrDefault(task, BigDecimal.ZERO).add(cost));

            YearMonth ym = YearMonth.from(d.getUsageDate());
            if (monthReqMap.containsKey(ym)) {
                monthReqMap.put(ym, monthReqMap.get(ym) + reqs);
                monthTokenMap.put(ym, monthTokenMap.get(ym) + tokens);
                monthCostMap.put(ym, monthCostMap.get(ym).add(cost));
            }

            Long tid = d.getTenantId();
            tenantReqMap.put(tid, tenantReqMap.getOrDefault(tid, 0L) + reqs);
            tenantTokenMap.put(tid, tenantTokenMap.getOrDefault(tid, 0L) + tokens);
            tenantCostMap.put(tid, tenantCostMap.getOrDefault(tid, BigDecimal.ZERO).add(cost));
        }

        // If detailed table has no records yet for older usage rows in tenant_usage_daily, derive baseline cost/requests from general usage
        if (totalAiRequests == 0L && (totalCvParses > 0L || totalVoiceSeconds > 0L)) {
            long estInterviewReqs = Math.max(0L, totalVoiceSeconds / 30L);
            totalAiRequests = totalCvParses + estInterviewReqs;
            BigDecimal cvCost = FALLBACK_COST_PER_CV_USD.multiply(BigDecimal.valueOf(totalCvParses));
            BigDecimal intCost = FALLBACK_COST_PER_INTERVIEW_SEC_USD.multiply(BigDecimal.valueOf(totalVoiceSeconds));
            totalEstimatedCostUsd = cvCost.add(intCost).setScale(4, RoundingMode.HALF_UP);

            taskRequestsMap.put("CV_PARSING", totalCvParses);
            taskCostMap.put("CV_PARSING", cvCost);
            taskRequestsMap.put("INTERVIEW_GEN", estInterviewReqs / 2);
            taskCostMap.put("INTERVIEW_GEN", intCost.multiply(new BigDecimal("0.45")));
            taskRequestsMap.put("INTERVIEW_NLP", estInterviewReqs - (estInterviewReqs / 2));
            taskCostMap.put("INTERVIEW_NLP", intCost.multiply(new BigDecimal("0.55")));
        }

        long effectiveTotalTokens = Math.max(totalDetailedTokens, totalTokensFromGeneral);
        long avgLatencyMs = totalAiRequests > 0 && totalLatencyMs > 0 ? (totalLatencyMs / totalAiRequests) : 0L;
        double successRate = totalAiRequests > 0
                ? Math.round(((double) (totalAiRequests - totalFailedRequests) * 10000.0) / totalAiRequests) / 100.0
                : 100.0;

        List<AiUsageReportDto.MonthlyUsagePoint> monthlyTrend = new ArrayList<>();
        for (YearMonth ym : monthCvMap.keySet()) {
            long cv = monthCvMap.getOrDefault(ym, 0L);
            long voiceSec = monthVoiceSecMap.getOrDefault(ym, 0L);
            double intHours = Math.round((voiceSec / 3600.0) * 100.0) / 100.0;
            long reqs = monthReqMap.getOrDefault(ym, 0L);
            if (reqs == 0L && (cv > 0 || voiceSec > 0)) {
                reqs = cv + (voiceSec / 30L);
            }
            BigDecimal cost = monthCostMap.getOrDefault(ym, BigDecimal.ZERO);
            if (cost.compareTo(BigDecimal.ZERO) == 0 && (cv > 0 || voiceSec > 0)) {
                cost = FALLBACK_COST_PER_CV_USD.multiply(BigDecimal.valueOf(cv))
                        .add(FALLBACK_COST_PER_INTERVIEW_SEC_USD.multiply(BigDecimal.valueOf(voiceSec)))
                        .setScale(4, RoundingMode.HALF_UP);
            }
            monthlyTrend.add(AiUsageReportDto.MonthlyUsagePoint.builder()
                    .month("T" + ym.getMonthValue() + "/" + (ym.getYear() % 100))
                    .cvCount(cv)
                    .interviewHours(intHours)
                    .aiRequests(reqs)
                    .totalTokens(monthTokenMap.getOrDefault(ym, 0L))
                    .estimatedCostUsd(cost.setScale(4, RoundingMode.HALF_UP))
                    .build());
        }

        List<AiUsageReportDto.TaskCostShare> costByTask = new ArrayList<>();
        Map<String, String> taskLabels = Map.of(
                "CV_PARSING", "CV Screening & Extraction",
                "INTERVIEW_GEN", "AI Interview Generation & Voice",
                "INTERVIEW_NLP", "AI Interview Evaluation (NLP)",
                "MATCHING", "Semantic Matching",
                "CODE_GRADING", "Code & Assessment Grading"
        );
        for (String task : List.of("CV_PARSING", "INTERVIEW_GEN", "INTERVIEW_NLP", "MATCHING", "CODE_GRADING")) {
            BigDecimal c = taskCostMap.getOrDefault(task, BigDecimal.ZERO);
            long reqs = taskRequestsMap.getOrDefault(task, 0L);
            int share = 0;
            if (totalEstimatedCostUsd.compareTo(BigDecimal.ZERO) > 0) {
                share = c.multiply(BigDecimal.valueOf(100))
                        .divide(totalEstimatedCostUsd, 0, RoundingMode.HALF_UP)
                        .intValue();
            } else if (totalAiRequests > 0) {
                share = (int) Math.round((reqs * 100.0) / totalAiRequests);
            }
            costByTask.add(AiUsageReportDto.TaskCostShare.builder()
                    .taskType(task)
                    .label(taskLabels.getOrDefault(task, task))
                    .requests(reqs)
                    .totalTokens(taskTokensMap.getOrDefault(task, 0L))
                    .costUsd(c.setScale(4, RoundingMode.HALF_UP))
                    .sharePercent(share)
                    .build());
        }

        List<AiUsageReportDto.TenantUsageItem> tenantUsages = new ArrayList<>();
        for (TenantInfo t : tenants) {
            Long tid = t.getId();
            long cv = tenantCvMap.getOrDefault(tid, 0L);
            long voiceSec = tenantVoiceSecMap.getOrDefault(tid, 0L);
            double intHours = Math.round((voiceSec / 3600.0) * 100.0) / 100.0;
            long reqs = tenantReqMap.getOrDefault(tid, 0L);
            if (reqs == 0L && (cv > 0 || voiceSec > 0)) {
                reqs = cv + (voiceSec / 30L);
            }
            BigDecimal cost = tenantCostMap.getOrDefault(tid, BigDecimal.ZERO);
            if (cost.compareTo(BigDecimal.ZERO) == 0 && (cv > 0 || voiceSec > 0)) {
                cost = FALLBACK_COST_PER_CV_USD.multiply(BigDecimal.valueOf(cv))
                        .add(FALLBACK_COST_PER_INTERVIEW_SEC_USD.multiply(BigDecimal.valueOf(voiceSec)));
            }
            long prevScore = tenantPrevMonthTokens.getOrDefault(tid, 0L);
            long currScore = tenantCurrMonthTokens.getOrDefault(tid, 0L);
            double changePercent = 0.0;
            if (prevScore > 0) {
                changePercent = Math.round(((currScore - prevScore) * 1000.0) / prevScore) / 10.0;
            } else if (currScore > 0) {
                changePercent = 100.0;
            }

            var resolvedSub = quotaRedisService.resolveSubscriptionAndPlan(t.getCode());
            String planName = resolvedSub.subscription() != null && resolvedSub.subscription().getPlanNameSnapshot() != null
                    ? resolvedSub.subscription().getPlanNameSnapshot()
                    : (resolvedSub.plan() != null ? resolvedSub.plan().getName() : "Starter");

            tenantUsages.add(AiUsageReportDto.TenantUsageItem.builder()
                    .tenantId(tid)
                    .tenantCode(t.getCode())
                    .tenantName(t.getName())
                    .planName(planName)
                    .cvParses(cv)
                    .interviewHours(intHours)
                    .totalRequests(reqs)
                    .totalTokens(tenantTokenMap.getOrDefault(tid, 0L))
                    .estimatedCostUsd(cost.setScale(4, RoundingMode.HALF_UP))
                    .changePercent(changePercent)
                    .build());
        }

        tenantUsages.sort(Comparator.comparing(AiUsageReportDto.TenantUsageItem::getEstimatedCostUsd)
                .thenComparingLong(AiUsageReportDto.TenantUsageItem::getCvParses)
                .reversed());

        return AiUsageReportDto.builder()
                .totalCvParses(totalCvParses)
                .totalInterviewHours(Math.round((totalVoiceSeconds / 3600.0) * 100.0) / 100.0)
                .totalAiRequests(totalAiRequests)
                .totalTokensConsumed(effectiveTotalTokens)
                .totalEstimatedCostUsd(totalEstimatedCostUsd.setScale(4, RoundingMode.HALF_UP))
                .avgLatencyMs(avgLatencyMs)
                .successRatePercent(successRate)
                .monthlyTrend(monthlyTrend)
                .costByTask(costByTask)
                .tenantUsages(tenantUsages)
                .build();
    }

    @Transactional(transactionManager = "masterTransactionManager", readOnly = true)
    public List<TenantAiQuotaDto> getTenantAiQuotas() {
        List<TenantInfo> tenants = tenantInfoRepository.findAll();
        LocalDate startOfMonth = LocalDate.now().withDayOfMonth(1);
        LocalDate today = LocalDate.now();

        List<TenantAiUsageDaily> monthAiUsages = aiUsageDailyRepository
                .findByUsageDateBetweenOrderByUsageDateAsc(startOfMonth, today);
        Map<Long, BigDecimal> monthCostByTenant = new HashMap<>();
        for (TenantAiUsageDaily d : monthAiUsages) {
            BigDecimal c = d.getEstimatedCostUsd() != null ? d.getEstimatedCostUsd() : BigDecimal.ZERO;
            monthCostByTenant.put(d.getTenantId(), monthCostByTenant.getOrDefault(d.getTenantId(), BigDecimal.ZERO).add(c));
        }

        List<TenantAiQuotaDto> result = new ArrayList<>();
        for (TenantInfo tenant : tenants) {
            result.add(buildTenantQuotaDto(tenant, monthCostByTenant.getOrDefault(tenant.getId(), BigDecimal.ZERO)));
        }
        return result;
    }

    @Transactional(transactionManager = "masterTransactionManager")
    public TenantAiQuotaDto updateTenantAiQuota(Long tenantId, TenantAiQuotaUpdateRequest req, String adminEmail) {
        TenantInfo tenant = tenantInfoRepository.findById(tenantId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy Tenant ID: " + tenantId, HttpStatus.NOT_FOUND, "TENANT_NOT_FOUND"));

        var resolved = quotaRedisService.resolveSubscriptionAndPlan(tenant.getCode());
        SubscriptionPlan plan = resolved.plan();
        TenantSubscription sub = resolved.subscription();

        if (sub == null) {
            sub = TenantSubscription.builder()
                    .tenantId(tenant.getId())
                    .planId(plan != null && plan.getId() != null ? plan.getId() : 1L)
                    .status("ACTIVE")
                    .build();
            sub.applyPlanSnapshot(plan);
        } else if (sub.getPlanCodeSnapshot() == null) {
            sub.applyPlanSnapshot(plan);
        }

        if (Boolean.TRUE.equals(req.getResetToPlanDefault())) {
            sub.setSnapshotMaxCvParses(plan != null ? plan.getMaxCvParses() : 200);
            sub.setSnapshotMaxAiInterviewHours(plan != null ? plan.getMaxAiInterviewHours() : 5);
            if (rateLimiterService != null) {
                rateLimiterService.setTenantRpmOverride(tenant.getCode(), null, adminEmail);
            }
        } else if (Boolean.TRUE.equals(req.getKillSwitch())) {
            sub.setSnapshotMaxCvParses(0);
            sub.setSnapshotMaxAiInterviewHours(0);
            if (rateLimiterService != null) {
                rateLimiterService.setTenantRpmOverride(tenant.getCode(), 0, adminEmail);
            }
        } else {
            if (req.getCvLimit() != null) {
                sub.setSnapshotMaxCvParses(req.getCvLimit() < 0 ? -1 : req.getCvLimit());
            }
            if (req.getInterviewHoursLimit() != null) {
                sub.setSnapshotMaxAiInterviewHours(req.getInterviewHoursLimit() < 0 ? -1 : req.getInterviewHoursLimit());
            }
            if (req.getRpmLimit() != null && rateLimiterService != null) {
                rateLimiterService.setTenantRpmOverride(tenant.getCode(), req.getRpmLimit(), adminEmail);
            }
        }

        subscriptionRepository.save(sub);
        quotaRedisService.evictCache(tenant.getCode());

        String action = Boolean.TRUE.equals(req.getKillSwitch()) ? "AI_KILL_SWITCH_ENABLED" : "AI_QUOTA_OVERRIDE_UPDATED";
        auditLogRepository.save(PlatformAuditLog.builder()
                .tenantCode(tenant.getCode())
                .action(action)
                .level("INFO")
                .description(String.format("Admin [%s] updated AI Quota for tenant %s: cvLimit=%s, interviewHoursLimit=%s, rpmLimit=%s, killSwitch=%s",
                        adminEmail != null ? adminEmail : "platform_admin",
                        tenant.getCode(), sub.getSnapshotMaxCvParses(), sub.getSnapshotMaxAiInterviewHours(), req.getRpmLimit(), req.getKillSwitch()))
                .build());

        LocalDate startOfMonth = LocalDate.now().withDayOfMonth(1);
        BigDecimal monthCost = aiUsageDailyRepository
                .findByTenantIdAndUsageDateBetweenOrderByUsageDateAsc(tenant.getId(), startOfMonth, LocalDate.now())
                .stream()
                .map(d -> d.getEstimatedCostUsd() != null ? d.getEstimatedCostUsd() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return buildTenantQuotaDto(tenant, monthCost);
    }

    private TenantAiQuotaDto buildTenantQuotaDto(TenantInfo tenant, BigDecimal monthCostUsd) {
        var resolved = quotaRedisService.resolveSubscriptionAndPlan(tenant.getCode());
        TenantSubscription sub = resolved.subscription();
        SubscriptionPlan plan = resolved.plan();

        long rawCvLimit = TenantQuotaRedisService.extractRawLimit(sub, plan, QuotaType.CV_PARSE);
        long rawVoiceSecLimit = TenantQuotaRedisService.extractRawLimit(sub, plan, QuotaType.AI_VOICE_SECONDS);

        int cvLimit = rawCvLimit < 0 ? -1 : (int) rawCvLimit;
        int interviewHoursLimit = rawVoiceSecLimit < 0
                ? -1
                : (rawVoiceSecLimit == 0 ? 0 : (int) (rawVoiceSecLimit / TenantQuotaRedisService.SECONDS_PER_HOUR));

        int basePlanCvLimit = plan != null && plan.getMaxCvParses() != null
                ? (plan.getMaxCvParses() < 0 ? -1 : plan.getMaxCvParses())
                : -1;
        int basePlanInterviewLimit = plan != null && plan.getMaxAiInterviewHours() != null
                ? (plan.getMaxAiInterviewHours() < 0 ? -1 : plan.getMaxAiInterviewHours())
                : -1;

        long cvUsed = quotaRedisService.getCurrentUsage(tenant.getCode(), QuotaType.CV_PARSE);
        long voiceSecondsUsed = quotaRedisService.getCurrentUsage(tenant.getCode(), QuotaType.AI_VOICE_SECONDS);
        double interviewHoursUsed = Math.round((voiceSecondsUsed / 3600.0) * 100.0) / 100.0;

        BigDecimal effectiveCost = monthCostUsd != null ? monthCostUsd : BigDecimal.ZERO;
        if (effectiveCost.compareTo(BigDecimal.ZERO) == 0 && (cvUsed > 0 || voiceSecondsUsed > 0)) {
            effectiveCost = FALLBACK_COST_PER_CV_USD.multiply(BigDecimal.valueOf(cvUsed))
                    .add(FALLBACK_COST_PER_INTERVIEW_SEC_USD.multiply(BigDecimal.valueOf(voiceSecondsUsed)));
        }

        String planCode = sub != null && sub.getPlanCodeSnapshot() != null
                ? sub.getPlanCodeSnapshot()
                : (plan != null ? plan.getCode() : "STARTER");
        String planName = sub != null && sub.getPlanNameSnapshot() != null
                ? sub.getPlanNameSnapshot()
                : (plan != null ? plan.getName() : "Starter");
        String subStatus = sub != null && sub.getStatus() != null ? sub.getStatus() : "ACTIVE";

        int effectiveRpmLimit = AiRateLimiterService.DEFAULT_RPM_LIMIT;
        Integer customRpmOverride = null;
        long currentMinuteRpm = 0L;
        long currentMinuteTpm = 0L;

        if (rateLimiterService != null && tenant.getCode() != null) {
            AiRateLimitConfigDto rlConfig = rateLimiterService.getRateLimitConfig();
            effectiveRpmLimit = rateLimiterService.resolveEffectiveRpmLimit(tenant.getCode(), rlConfig);
            if (rlConfig != null && rlConfig.getTenantRpmOverrides() != null) {
                customRpmOverride = rlConfig.getTenantRpmOverrides().get(tenant.getCode().trim().toLowerCase());
            }
            long[] liveUsage = rateLimiterService.getCurrentMinuteUsage(tenant.getCode());
            currentMinuteRpm = liveUsage[0];
            currentMinuteTpm = liveUsage[1];
        }

        return TenantAiQuotaDto.builder()
                .tenantId(tenant.getId())
                .tenantCode(tenant.getCode())
                .tenantName(tenant.getName())
                .planCode(planCode)
                .planName(planName)
                .subscriptionStatus(subStatus)
                .cvUsed(cvUsed)
                .cvLimit(cvLimit)
                .basePlanCvLimit(basePlanCvLimit)
                .interviewHoursUsed(interviewHoursUsed)
                .interviewHoursLimit(interviewHoursLimit)
                .basePlanInterviewHoursLimit(basePlanInterviewLimit)
                .aiKillSwitch(cvLimit == 0 && interviewHoursLimit == 0)
                .estimatedCostUsdMonth(effectiveCost.setScale(4, RoundingMode.HALF_UP))
                .effectiveRpmLimit(effectiveRpmLimit)
                .customRpmOverride(customRpmOverride)
                .currentMinuteRpm(currentMinuteRpm)
                .currentMinuteTpm(currentMinuteTpm)
                .build();
    }
}
