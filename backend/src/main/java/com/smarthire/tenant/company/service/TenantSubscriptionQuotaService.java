package com.smarthire.tenant.company.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.enums.JobStatus;
import com.smarthire.domain.master.entity.Invoice;
import com.smarthire.domain.master.entity.InvoiceLineItem;
import com.smarthire.domain.master.entity.SubscriptionPlan;
import com.smarthire.domain.master.entity.TenantInfo;
import com.smarthire.domain.master.entity.TenantSubscription;
import com.smarthire.domain.master.repository.InvoiceLineItemRepository;
import com.smarthire.domain.master.repository.InvoiceRepository;
import com.smarthire.domain.master.repository.SubscriptionPlanRepository;
import com.smarthire.domain.master.repository.TenantInfoRepository;
import com.smarthire.domain.master.repository.TenantSubscriptionRepository;
import com.smarthire.domain.tenant.repository.AiAnswerRecordingRepository;
import com.smarthire.domain.tenant.repository.CvRepository;
import com.smarthire.domain.tenant.repository.InterviewMessageRepository;
import com.smarthire.domain.tenant.repository.JobRepository;
import com.smarthire.master.billing.dto.CheckoutResponse;
import com.smarthire.master.billing.service.MasterBillingService;
import com.smarthire.multitenancy.context.TenantContext;
import com.smarthire.multitenancy.quota.QuotaType;
import com.smarthire.multitenancy.quota.TenantQuotaRedisService;
import com.smarthire.tenant.company.dto.RenewSubscriptionRequest;
import com.smarthire.tenant.company.dto.SubscriptionChangePreviewResponse;
import com.smarthire.tenant.company.dto.SubscriptionChangeRequest;
import com.smarthire.tenant.company.dto.TenantSubscriptionQuotaResponse;
import com.smarthire.tenant.company.dto.TenantSubscriptionQuotaResponse.TenantInvoiceItem;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ThreadLocalRandom;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TenantSubscriptionQuotaService {

    private static final Set<String> NON_PENDING_FALLBACK_STATUSES = Set.of(
            "SUSPENDED", "CANCELED", "CANCELLED", "EXPIRED"
    );

    private final TenantInfoRepository tenantInfoRepository;
    private final TenantSubscriptionRepository subscriptionRepository;
    private final SubscriptionPlanRepository planRepository;
    private final InvoiceRepository invoiceRepository;
    private final TenantQuotaRedisService quotaRedisService;
    private final JobRepository jobRepository;
    private final CvRepository cvRepository;
    private final InterviewMessageRepository interviewMessageRepository;
    private final AiAnswerRecordingRepository aiAnswerRecordingRepository;
    private final ObjectMapper objectMapper;

    @Autowired(required = false)
    private InvoiceLineItemRepository invoiceLineItemRepository;

    @Autowired(required = false)
    private com.smarthire.config.PlatformProperties platformProperties;

    public TenantSubscriptionQuotaResponse getCurrentSubscriptionAndQuotas() {
        String tenantCode = requireTenantCode();

        Optional<TenantInfo> tenantOpt = tenantInfoRepository.findByCode(tenantCode);
        TenantInfo tenant = tenantOpt.orElse(null);

        TenantSubscription activeSub = resolveCurrentTenantSubscription(tenant);
        SubscriptionPlan plan = null;
        String subscriptionStatus = "FALLBACK_STARTER";

        if (activeSub != null) {
            plan = planRepository.findById(activeSub.getPlanId()).orElse(null);
            subscriptionStatus = activeSub.getStatus();
        }

        if (plan == null) {
            plan = planRepository.findByCode("STARTER").orElse(null);
        }

        // Read Tier 2 Snapshot first (Grandfathering & Custom Plan protection), fallback to Tier 1 Plan
        String planCode = (activeSub != null && activeSub.getPlanCodeSnapshot() != null)
                ? activeSub.getPlanCodeSnapshot()
                : (plan != null ? plan.getCode() : "STARTER");
        String planName = (activeSub != null && activeSub.getPlanNameSnapshot() != null)
                ? activeSub.getPlanNameSnapshot()
                : (plan != null ? plan.getName() : "Gói Khởi Đầu");
        Integer planVersion = (activeSub != null && activeSub.getPlanVersionSnapshot() != null)
                ? activeSub.getPlanVersionSnapshot()
                : (plan != null && plan.getVersion() != null ? plan.getVersion() : 1);
        String description = plan != null ? plan.getDescription() : "Gói khởi đầu dành cho doanh nghiệp nhỏ và công ty mới thành lập.";
        BigDecimal priceYearly = (activeSub != null && activeSub.getContractedPriceYearly() != null)
                ? activeSub.getContractedPriceYearly()
                : (plan != null && plan.getPriceYearly() != null ? plan.getPriceYearly() : BigDecimal.valueOf(24_000_000L));

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime startsAt = activeSub != null && activeSub.getStartsAt() != null
                ? activeSub.getStartsAt()
                : (tenant != null && tenant.getCreatedAt() != null ? tenant.getCreatedAt() : now.minusDays(1));
        LocalDateTime endsAt = activeSub != null && activeSub.getEndsAt() != null
                ? activeSub.getEndsAt()
                : startsAt.plusYears(1);
        boolean hasExplicitSubscription = activeSub != null;
        boolean autoRenew = activeSub != null && activeSub.isAutoRenew();
        long daysRemaining = Math.max(0L, Duration.between(now, endsAt).toDays());

        String nextPlanCode = null;
        String nextPlanName = null;
        if (activeSub != null && activeSub.getNextPlanId() != null) {
            SubscriptionPlan nextPlan = planRepository.findById(activeSub.getNextPlanId()).orElse(null);
            if (nextPlan != null) {
                nextPlanCode = nextPlan.getCode();
                nextPlanName = nextPlan.getName();
            }
        }

        // Quota limits from Redis / Tier 2 Snapshot (with -1 = unlimited, 0 = disabled)
        long maxJobs = quotaRedisService.getRawLimit(tenantCode, QuotaType.ACTIVE_JOBS);
        long maxCvParses = quotaRedisService.getRawLimit(tenantCode, QuotaType.CV_PARSE);
        long maxAiInterviewSeconds = quotaRedisService.getRawLimit(tenantCode, QuotaType.AI_VOICE_SECONDS);
        long maxAiInterviewHours = maxAiInterviewSeconds < 0 ? -1L : maxAiInterviewSeconds / 3600L;
        long maxProctoringSeconds = quotaRedisService.getRawLimit(tenantCode, QuotaType.PROCTORING_SECONDS);
        long maxProctoringHours = maxProctoringSeconds < 0 ? -1L : maxProctoringSeconds / 3600L;
        long maxStorageBytes = quotaRedisService.getRawLimit(tenantCode, QuotaType.STORAGE_BYTES);
        long maxStorageGb = maxStorageBytes < 0 ? -1L : maxStorageBytes / (1024L * 1024L * 1024L);
        long videoRetentionDays = quotaRedisService.getVideoRetentionDays(tenantCode);

        // Actual usage
        long usedJobs = countActiveJobsSafely();
        long usedCvParses = quotaRedisService.getCurrentUsage(tenantCode, QuotaType.CV_PARSE);
        long usedAiInterviewSeconds = quotaRedisService.getCurrentUsage(tenantCode, QuotaType.AI_VOICE_SECONDS);
        long usedProctoringSeconds = quotaRedisService.getCurrentUsage(tenantCode, QuotaType.PROCTORING_SECONDS);
        long usedStorageBytes = calculateStorageBytesSafely();

        // Sync active jobs & storage snapshot into tenant_usage_daily
        quotaRedisService.syncActiveJobsCount(tenantCode, usedJobs);

        int jobsPct = computePercent(usedJobs, maxJobs);
        int cvPct = computePercent(usedCvParses, maxCvParses);
        int aiPct = computePercent(usedAiInterviewSeconds, maxAiInterviewSeconds);
        int proctorPct = computePercent(usedProctoringSeconds, maxProctoringSeconds);
        int storagePct = computePercent(usedStorageBytes, maxStorageBytes);

        String featuresJsonSource = (activeSub != null && activeSub.getSnapshotFeaturesJson() != null && !activeSub.getSnapshotFeaturesJson().isBlank())
                ? activeSub.getSnapshotFeaturesJson()
                : (plan != null ? plan.getFeaturesJson() : null);
        List<String> features = parseFeatures(featuresJsonSource);
        List<TenantInvoiceItem> invoices = loadTenantInvoices(tenant);

        boolean isOperational = !"SUSPENDED".equalsIgnoreCase(subscriptionStatus)
                && !"CANCELED".equalsIgnoreCase(subscriptionStatus)
                && !"CANCELLED".equalsIgnoreCase(subscriptionStatus)
                && !"EXPIRED".equalsIgnoreCase(subscriptionStatus);

        return TenantSubscriptionQuotaResponse.builder()
                .tenantCode(tenantCode)
                .planCode(planCode)
                .planName(planName)
                .planVersion(planVersion)
                .description(description)
                .priceYearly(priceYearly)
                .subscriptionStatus(subscriptionStatus)
                .hasExplicitSubscription(hasExplicitSubscription)
                .autoRenew(autoRenew)
                .startsAt(startsAt)
                .endsAt(endsAt)
                .daysRemaining(daysRemaining)
                .gracePeriodEndsAt(activeSub != null ? activeSub.getGracePeriodEndsAt() : null)
                .nextPlanCode(nextPlanCode)
                .nextPlanName(nextPlanName)
                .proratedCreditAmount(activeSub != null ? activeSub.getProratedCreditAmount() : BigDecimal.ZERO)
                .usedJobs(usedJobs)
                .maxJobs(maxJobs)
                .jobsUsagePercent(jobsPct)
                .jobsEnabled(isOperational && maxJobs != 0L)
                .jobsAllowed(isOperational && (maxJobs < 0L || (maxJobs > 0L && usedJobs < maxJobs)))
                .usedCvParses(usedCvParses)
                .maxCvParses(maxCvParses)
                .cvParsesUsagePercent(cvPct)
                .cvParseEnabled(isOperational && maxCvParses != 0L)
                .cvParseAllowed(isOperational && (maxCvParses < 0L || (maxCvParses > 0L && usedCvParses < maxCvParses)))
                .usedAiInterviewSeconds(usedAiInterviewSeconds)
                .maxAiInterviewHours(maxAiInterviewHours)
                .maxAiInterviewSeconds(maxAiInterviewSeconds)
                .aiInterviewUsagePercent(aiPct)
                .aiInterviewEnabled(isOperational && maxAiInterviewSeconds != 0L)
                .aiInterviewAllowed(isOperational && (maxAiInterviewSeconds < 0L || (maxAiInterviewSeconds > 0L && usedAiInterviewSeconds < maxAiInterviewSeconds)))
                .usedProctoringSeconds(usedProctoringSeconds)
                .maxProctoringHours(maxProctoringHours)
                .maxProctoringSeconds(maxProctoringSeconds)
                .proctoringUsagePercent(proctorPct)
                .proctoringEnabled(isOperational && maxProctoringSeconds != 0L)
                .proctoringAllowed(isOperational && (maxProctoringSeconds < 0L || (maxProctoringSeconds > 0L && usedProctoringSeconds < maxProctoringSeconds)))
                .usedStorageBytes(usedStorageBytes)
                .maxStorageGb(maxStorageGb)
                .maxStorageBytes(maxStorageBytes)
                .storageUsagePercent(storagePct)
                .storageEnabled(isOperational && maxStorageBytes != 0L)
                .storageAllowed(isOperational && (maxStorageBytes < 0L || (maxStorageBytes > 0L && usedStorageBytes < maxStorageBytes)))
                .videoRetentionDays(videoRetentionDays)
                .videoRetentionEnabled(isOperational && videoRetentionDays != 0L)
                .features(features)
                .invoices(invoices)
                .build();
    }

    /**
     * Previews Upgrade (with Proration credit for unused days) or Downgrade (scheduled at end of billing cycle).
     */
    public SubscriptionChangePreviewResponse previewPlanChange(String targetPlanCode) {
        String tenantCode = requireTenantCode();
        if (targetPlanCode == null || targetPlanCode.isBlank()) {
            throw new BusinessException("Target plan code is required", HttpStatus.BAD_REQUEST, "TARGET_PLAN_REQUIRED");
        }

        SubscriptionPlan targetPlan = planRepository.findByCode(targetPlanCode.trim().toUpperCase())
                .orElseThrow(() -> new BusinessException("Gói dịch vụ mục tiêu không tồn tại: " + targetPlanCode, HttpStatus.NOT_FOUND, "PLAN_NOT_FOUND"));

        TenantInfo tenant = tenantInfoRepository.findByCode(tenantCode).orElse(null);
        TenantSubscription activeSub = resolveCurrentTenantSubscription(tenant);
        SubscriptionPlan currentPlan = activeSub != null
                ? planRepository.findById(activeSub.getPlanId()).orElse(null)
                : planRepository.findByCode("STARTER").orElse(null);

        String currentPlanCode = (activeSub != null && activeSub.getPlanCodeSnapshot() != null)
                ? activeSub.getPlanCodeSnapshot()
                : (currentPlan != null ? currentPlan.getCode() : "STARTER");
        String currentPlanName = (activeSub != null && activeSub.getPlanNameSnapshot() != null)
                ? activeSub.getPlanNameSnapshot()
                : (currentPlan != null ? currentPlan.getName() : "Gói Khởi Đầu");
        BigDecimal currentPrice = (activeSub != null && activeSub.getContractedPriceYearly() != null)
                ? activeSub.getContractedPriceYearly()
                : (currentPlan != null && currentPlan.getPriceYearly() != null ? currentPlan.getPriceYearly() : BigDecimal.ZERO);

        BigDecimal targetPrice = targetPlan.getPriceYearly() != null ? targetPlan.getPriceYearly() : BigDecimal.ZERO;

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime startsAt = activeSub != null && activeSub.getStartsAt() != null ? activeSub.getStartsAt() : now.minusDays(1);
        LocalDateTime endsAt = activeSub != null && activeSub.getEndsAt() != null ? activeSub.getEndsAt() : startsAt.plusYears(1);

        long totalDays = Math.max(1L, Duration.between(startsAt, endsAt).toDays());
        long remainingDays = Math.max(0L, Duration.between(now, endsAt).toDays());

        List<String> warnings = new ArrayList<>();
        boolean allowed = true;

        int priceComparison = targetPrice.compareTo(currentPrice);
        String changeType;
        String effectiveTiming;
        LocalDateTime effectiveDate;
        BigDecimal proratedCredit = BigDecimal.ZERO;
        BigDecimal netAmountDue = targetPrice;

        if (targetPlan.getCode().equalsIgnoreCase(currentPlanCode) && priceComparison == 0) {
            changeType = "SAME_PLAN";
            effectiveTiming = "NONE";
            effectiveDate = now;
            allowed = false;
            warnings.add("Doanh nghiệp hiện đang sử dụng gói " + currentPlanName + ".");
        } else if (priceComparison > 0) {
            changeType = "UPGRADE";
            effectiveTiming = "IMMEDIATE";
            effectiveDate = now;
            if (activeSub != null
                    && ("ACTIVE".equalsIgnoreCase(activeSub.getStatus()) || "PAST_DUE".equalsIgnoreCase(activeSub.getStatus()))
                    && remainingDays > 0) {
                proratedCredit = currentPrice
                        .multiply(BigDecimal.valueOf(remainingDays))
                        .divide(BigDecimal.valueOf(Math.max(totalDays, remainingDays)), 0, RoundingMode.HALF_UP);
            }
            netAmountDue = targetPrice.subtract(proratedCredit).max(BigDecimal.ZERO);
        } else {
            changeType = "DOWNGRADE";
            effectiveTiming = "END_OF_CYCLE";
            effectiveDate = endsAt;
            proratedCredit = BigDecimal.ZERO;
            netAmountDue = targetPrice;

            long usedJobs = countActiveJobsSafely();
            long targetMaxJobs = TenantQuotaRedisService.extractRawLimitFromPlan(targetPlan, QuotaType.ACTIVE_JOBS);
            if (targetMaxJobs >= 0 && usedJobs > targetMaxJobs) {
                warnings.add("Doanh nghiệp đang mở " + usedJobs + " vị trí tuyển dụng, vượt hạn mức " + targetMaxJobs
                        + " vị trí của gói " + targetPlan.getName()
                        + ". Việc hạ cấp sẽ có hiệu lực vào cuối chu kỳ hiện tại ("
                        + endsAt.toLocalDate() + ") để không làm gián đoạn các tin đang mở.");
            }
        }

        return SubscriptionChangePreviewResponse.builder()
                .changeType(changeType)
                .currentPlanCode(currentPlanCode)
                .currentPlanName(currentPlanName)
                .currentContractedPriceYearly(currentPrice)
                .targetPlanCode(targetPlan.getCode())
                .targetPlanName(targetPlan.getName())
                .targetPriceYearly(targetPrice)
                .totalCycleDays(totalDays)
                .remainingDays(remainingDays)
                .proratedCreditAmount(proratedCredit)
                .netAmountDue(netAmountDue)
                .effectiveTiming(effectiveTiming)
                .effectiveDate(effectiveDate)
                .allowed(allowed)
                .warnings(warnings)
                .build();
    }

    /**
     * Executes an Upgrade (creates PENDING upgrade subscription + proration invoice until payment is confirmed;
     * or activates immediately if netAmountDue == 0) or schedules a Downgrade for end of cycle.
     */
    public TenantSubscriptionQuotaResponse executePlanChange(SubscriptionChangeRequest request) {
        String tenantCode = requireTenantCode();
        TenantInfo tenant = requireTenant(tenantCode);

        SubscriptionChangePreviewResponse preview = previewPlanChange(request.getTargetPlanCode());
        if (!preview.isAllowed()) {
            throw new BusinessException(
                    preview.getWarnings() != null && !preview.getWarnings().isEmpty()
                            ? preview.getWarnings().get(0)
                            : "Không thể chuyển sang gói cước này",
                    HttpStatus.BAD_REQUEST,
                    "PLAN_CHANGE_NOT_ALLOWED"
            );
        }

        SubscriptionPlan targetPlan = planRepository.findByCode(request.getTargetPlanCode().trim().toUpperCase())
                .orElseThrow(() -> new BusinessException("Gói dịch vụ mục tiêu không tồn tại", HttpStatus.NOT_FOUND, "PLAN_NOT_FOUND"));

        TenantSubscription activeSub = resolveCurrentTenantSubscription(tenant);
        LocalDateTime now = LocalDateTime.now();

        if ("UPGRADE".equals(preview.getChangeType())) {
            cancelStaleSelfServePendingInvoices(tenant.getId(), "SUPERSEDED_BY_PLAN_UPGRADE");

            BigDecimal netDue = preview.getNetAmountDue() != null ? preview.getNetAmountDue() : BigDecimal.ZERO;
            boolean requiresPayment = netDue.compareTo(BigDecimal.ZERO) > 0;
            Long oldSubId = activeSub != null ? activeSub.getId() : null;
            LocalDateTime newEndsAt = now.plusYears(1);

            if (!requiresPayment && activeSub != null) {
                activeSub.setStatus("CANCELED");
                activeSub.setCanceledAt(now);
                activeSub.setCancelReason("UPGRADED_TO_" + targetPlan.getCode());
                subscriptionRepository.save(activeSub);
            }

            TenantSubscription upgradedSub = TenantSubscription.builder()
                    .tenantId(tenant.getId())
                    .planId(targetPlan.getId())
                    .status(requiresPayment ? "PENDING" : "ACTIVE")
                    .startsAt(now)
                    .endsAt(newEndsAt)
                    .autoRenew(activeSub == null || activeSub.isAutoRenew())
                    .proratedCreditAmount(preview.getProratedCreditAmount())
                    .upgradedFromSubscriptionId(oldSubId)
                    .build();
            upgradedSub.applyPlanSnapshot(targetPlan);
            upgradedSub = subscriptionRepository.save(upgradedSub);

            String invoiceNumber = generateInvoiceNumber(now);
            String notes = "Nâng cấp gói " + preview.getCurrentPlanName() + " -> " + targetPlan.getName()
                    + " (Khấu trừ bù trừ " + preview.getRemainingDays() + "/" + preview.getTotalCycleDays()
                    + " ngày: -" + preview.getProratedCreditAmount() + " VNĐ)";
            if (StringUtils.hasText(request.getNotes())) {
                notes += " | " + request.getNotes().trim();
            }

            Invoice upgradeInvoice = Invoice.builder()
                    .invoiceNumber(invoiceNumber)
                    .tenantId(tenant.getId())
                    .subscriptionId(upgradedSub.getId())
                    .amount(netDue)
                    .subtotal(preview.getTargetPriceYearly())
                    .currency("VND")
                    .status(requiresPayment ? "PENDING" : "PAID")
                    .paidAt(requiresPayment ? null : now)
                    .dueDate(now.plusDays(7))
                    .billingPeriodStart(now)
                    .billingPeriodEnd(newEndsAt)
                    .paymentGateway(requiresPayment ? "BANK_TRANSFER" : "PRORATION_CREDIT")
                    .notes(notes)
                    .build();
            upgradeInvoice = invoiceRepository.save(upgradeInvoice);

            if (invoiceLineItemRepository != null && upgradeInvoice != null && upgradeInvoice.getId() != null) {
                List<InvoiceLineItem> items = new ArrayList<>();
                items.add(InvoiceLineItem.builder()
                        .invoiceId(upgradeInvoice.getId())
                        .description("Nâng cấp gói " + targetPlan.getName() + " (1 năm)")
                        .quantity(1)
                        .unitPrice(preview.getTargetPriceYearly())
                        .totalPrice(preview.getTargetPriceYearly())
                        .itemType("SUBSCRIPTION_UPGRADE")
                        .build());
                if (preview.getProratedCreditAmount() != null && preview.getProratedCreditAmount().compareTo(BigDecimal.ZERO) > 0) {
                    BigDecimal negativeCredit = preview.getProratedCreditAmount().negate();
                    items.add(InvoiceLineItem.builder()
                            .invoiceId(upgradeInvoice.getId())
                            .description("Khấu trừ " + preview.getRemainingDays() + "/" + preview.getTotalCycleDays()
                                    + " ngày chưa dùng từ gói " + preview.getCurrentPlanName())
                            .quantity(1)
                            .unitPrice(negativeCredit)
                            .totalPrice(negativeCredit)
                            .itemType("PRORATION_CREDIT")
                            .build());
                }
                invoiceLineItemRepository.saveAll(items);
            }

            if (!requiresPayment) {
                quotaRedisService.evictCache(tenantCode);
            }
        } else if ("DOWNGRADE".equals(preview.getChangeType())) {
            cancelStaleSelfServePendingInvoices(tenant.getId(), "SUPERSEDED_BY_DOWNGRADE_SCHEDULE");
            if (activeSub == null) {
                TenantSubscription newSub = TenantSubscription.builder()
                        .tenantId(tenant.getId())
                        .planId(targetPlan.getId())
                        .status("ACTIVE")
                        .startsAt(now)
                        .endsAt(now.plusYears(1))
                        .autoRenew(true)
                        .build();
                newSub.applyPlanSnapshot(targetPlan);
                subscriptionRepository.save(newSub);
                quotaRedisService.evictCache(tenantCode);
            } else {
                // Schedule Downgrade for end of current billing cycle (ends_at)
                activeSub.setNextPlanId(targetPlan.getId());
                subscriptionRepository.save(activeSub);
            }
        }

        return getCurrentSubscriptionAndQuotas();
    }

    /**
     * Generates a renewal invoice for 1..5 years on the tenant's current plan (or activates Starter when in FALLBACK_STARTER).
     * Active/PAST_DUE/SUSPENDED/EXPIRED subscriptions extend seamlessly on payment without losing remaining days.
     */
    public TenantSubscriptionQuotaResponse renewSubscription(RenewSubscriptionRequest request) {
        String tenantCode = requireTenantCode();
        TenantInfo tenant = requireTenant(tenantCode);

        int years = request != null && request.getYears() != null
                ? Math.max(1, Math.min(5, request.getYears()))
                : 1;

        TenantSubscription activeSub = resolveCurrentTenantSubscription(tenant);
        if (activeSub != null && activeSub.getNextPlanId() != null) {
            throw new BusinessException(
                    "Doanh nghiệp đang có lịch hạ cấp gói vào cuối chu kỳ. Vui lòng hủy lịch hạ cấp trước khi gia hạn gói hiện tại.",
                    HttpStatus.BAD_REQUEST,
                    "SCHEDULED_DOWNGRADE_CONFLICT"
            );
        }

        cancelStaleSelfServePendingInvoices(tenant.getId(), "SUPERSEDED_BY_RENEWAL_ORDER");

        LocalDateTime now = LocalDateTime.now();
        SubscriptionPlan plan = resolveCurrentOrStarterPlan(activeSub);
        if (plan == null) {
            throw new BusinessException("Không tìm thấy gói cước hiện hành để gia hạn", HttpStatus.NOT_FOUND, "PLAN_NOT_FOUND");
        }

        String planName = (activeSub != null && StringUtils.hasText(activeSub.getPlanNameSnapshot()))
                ? activeSub.getPlanNameSnapshot()
                : plan.getName();
        BigDecimal unitPriceYearly = (activeSub != null && activeSub.getContractedPriceYearly() != null)
                ? activeSub.getContractedPriceYearly()
                : (plan.getPriceYearly() != null ? plan.getPriceYearly() : BigDecimal.ZERO);

        boolean createNewSub = activeSub == null
                || "CANCELED".equalsIgnoreCase(activeSub.getStatus())
                || "CANCELLED".equalsIgnoreCase(activeSub.getStatus());

        LocalDateTime baseStart = (!createNewSub && activeSub.getEndsAt() != null && activeSub.getEndsAt().isAfter(now))
                ? activeSub.getEndsAt()
                : now;
        LocalDateTime periodEnd = baseStart.plusYears(years);

        BigDecimal totalAmount = unitPriceYearly.multiply(BigDecimal.valueOf(years));
        boolean requiresPayment = totalAmount.compareTo(BigDecimal.ZERO) > 0;

        Long targetSubId;
        if (createNewSub) {
            TenantSubscription pendingSub = TenantSubscription.builder()
                    .tenantId(tenant.getId())
                    .planId(plan.getId())
                    .status(requiresPayment ? "PENDING" : "ACTIVE")
                    .startsAt(now)
                    .endsAt(periodEnd)
                    .autoRenew(activeSub == null || activeSub.isAutoRenew())
                    .upgradedFromSubscriptionId(activeSub != null ? activeSub.getId() : null)
                    .build();
            pendingSub.applyPlanSnapshot(plan);
            pendingSub = subscriptionRepository.save(pendingSub);
            targetSubId = pendingSub.getId();
        } else {
            targetSubId = activeSub.getId();
            if (!requiresPayment) {
                if (activeSub.getStartsAt() == null || !baseStart.isAfter(now)) {
                    activeSub.setStartsAt(now);
                }
                activeSub.setEndsAt(periodEnd);
                activeSub.setStatus("ACTIVE");
                activeSub.setGracePeriodEndsAt(null);
                subscriptionRepository.save(activeSub);
            }
        }

        String notes = "Gia hạn gói " + planName + " (" + years + " năm)";
        if (request != null && StringUtils.hasText(request.getNotes())) {
            notes += " | " + request.getNotes().trim();
        }

        Invoice renewalInvoice = Invoice.builder()
                .invoiceNumber(generateInvoiceNumber(now))
                .tenantId(tenant.getId())
                .subscriptionId(targetSubId)
                .amount(totalAmount)
                .subtotal(totalAmount)
                .currency("VND")
                .status(requiresPayment ? "PENDING" : "PAID")
                .paidAt(requiresPayment ? null : now)
                .dueDate(now.plusDays(7))
                .billingPeriodStart(baseStart)
                .billingPeriodEnd(periodEnd)
                .paymentGateway(requiresPayment ? "BANK_TRANSFER" : "FREE_PLAN")
                .notes(notes)
                .build();
        renewalInvoice = invoiceRepository.save(renewalInvoice);

        if (invoiceLineItemRepository != null && renewalInvoice != null && renewalInvoice.getId() != null) {
            InvoiceLineItem item = InvoiceLineItem.builder()
                    .invoiceId(renewalInvoice.getId())
                    .description("Gia hạn gói " + planName + " (" + years + " năm)")
                    .quantity(years)
                    .unitPrice(unitPriceYearly)
                    .totalPrice(totalAmount)
                    .itemType("SUBSCRIPTION_RENEWAL")
                    .build();
            invoiceLineItemRepository.save(item);
        }

        if (!requiresPayment) {
            quotaRedisService.evictCache(tenantCode);
        }

        return getCurrentSubscriptionAndQuotas();
    }

    public TenantSubscriptionQuotaResponse updateAutoRenew(boolean autoRenew) {
        String tenantCode = requireTenantCode();
        TenantInfo tenant = tenantInfoRepository.findByCode(tenantCode).orElse(null);
        TenantSubscription activeSub = resolveCurrentTenantSubscription(tenant);
        if (activeSub == null) {
            throw new BusinessException(
                    "Doanh nghiệp chưa có gói thuê bao trả phí. Vui lòng gia hạn hoặc nâng cấp gói để bật tự động gia hạn.",
                    HttpStatus.BAD_REQUEST,
                    "NO_EXPLICIT_SUBSCRIPTION"
            );
        }
        activeSub.setAutoRenew(autoRenew);
        subscriptionRepository.save(activeSub);
        return getCurrentSubscriptionAndQuotas();
    }

    public CheckoutResponse getInvoiceCheckoutDetails(Long invoiceId) {
        String tenantCode = requireTenantCode();
        TenantInfo tenant = requireTenant(tenantCode);
        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new BusinessException("Hóa đơn không tồn tại: " + invoiceId, HttpStatus.NOT_FOUND, "INVOICE_NOT_FOUND"));

        if (!tenant.getId().equals(invoice.getTenantId())) {
            throw new BusinessException("Không có quyền truy cập hóa đơn này", HttpStatus.FORBIDDEN, "FORBIDDEN");
        }

        SubscriptionPlan plan = null;
        if (invoice.getSubscriptionId() != null) {
            TenantSubscription sub = subscriptionRepository.findById(invoice.getSubscriptionId()).orElse(null);
            if (sub != null) {
                plan = planRepository.findById(sub.getPlanId()).orElse(null);
                if (plan == null && StringUtils.hasText(sub.getPlanNameSnapshot())) {
                    plan = SubscriptionPlan.builder()
                            .id(sub.getPlanId())
                            .code(sub.getPlanCodeSnapshot() != null ? sub.getPlanCodeSnapshot() : "CUSTOM")
                            .name(sub.getPlanNameSnapshot())
                            .priceYearly(sub.getContractedPriceYearly())
                            .build();
                }
            }
        }
        return MasterBillingService.toCheckoutResponse(
                invoice,
                tenant,
                plan,
                platformProperties != null ? platformProperties : new com.smarthire.config.PlatformProperties()
        );
    }

    public TenantSubscriptionQuotaResponse cancelPendingInvoice(Long invoiceId) {
        String tenantCode = requireTenantCode();
        TenantInfo tenant = requireTenant(tenantCode);
        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new BusinessException("Hóa đơn không tồn tại: " + invoiceId, HttpStatus.NOT_FOUND, "INVOICE_NOT_FOUND"));

        if (!tenant.getId().equals(invoice.getTenantId())) {
            throw new BusinessException("Không có quyền hủy hóa đơn này", HttpStatus.FORBIDDEN, "FORBIDDEN");
        }
        if (!"PENDING".equalsIgnoreCase(invoice.getStatus())) {
            throw new BusinessException("Chỉ có thể hủy hóa đơn ở trạng thái chờ thanh toán (PENDING)", HttpStatus.BAD_REQUEST, "INVALID_INVOICE_STATE");
        }

        LocalDateTime now = LocalDateTime.now();
        invoice.setStatus("CANCELLED");
        String cancelNote = "Đã hủy bởi quản trị viên doanh nghiệp";
        invoice.setNotes(StringUtils.hasText(invoice.getNotes()) ? invoice.getNotes() + " | " + cancelNote : cancelNote);
        invoiceRepository.save(invoice);

        if (invoice.getSubscriptionId() != null) {
            subscriptionRepository.findById(invoice.getSubscriptionId()).ifPresent(sub -> {
                if ("PENDING".equalsIgnoreCase(sub.getStatus())) {
                    sub.setStatus("CANCELED");
                    sub.setCanceledAt(now);
                    sub.setCancelReason("CANCELED_BY_TENANT_ADMIN");
                    subscriptionRepository.save(sub);
                }
            });
        }

        return getCurrentSubscriptionAndQuotas();
    }

    public TenantSubscriptionQuotaResponse cancelScheduledDowngrade() {
        String tenantCode = requireTenantCode();
        TenantInfo tenant = tenantInfoRepository.findByCode(tenantCode).orElse(null);
        TenantSubscription activeSub = resolveCurrentTenantSubscription(tenant);
        if (activeSub != null && activeSub.getNextPlanId() != null) {
            activeSub.setNextPlanId(null);
            subscriptionRepository.save(activeSub);
        }
        return getCurrentSubscriptionAndQuotas();
    }

    private String requireTenantCode() {
        String tenantCode = TenantContext.getCurrentTenant();
        if (tenantCode == null || tenantCode.isBlank()) {
            throw new BusinessException("Missing tenant context", HttpStatus.BAD_REQUEST, "MISSING_TENANT_CONTEXT");
        }
        return tenantCode;
    }

    private TenantInfo requireTenant(String tenantCode) {
        return tenantInfoRepository.findByCode(tenantCode)
                .orElseThrow(() -> new BusinessException("Doanh nghiệp không tồn tại: " + tenantCode, HttpStatus.NOT_FOUND, "TENANT_NOT_FOUND"));
    }

    private SubscriptionPlan resolveCurrentOrStarterPlan(TenantSubscription activeSub) {
        SubscriptionPlan plan = activeSub != null && activeSub.getPlanId() != null
                ? planRepository.findById(activeSub.getPlanId()).orElse(null)
                : null;
        if (plan == null) {
            plan = planRepository.findByCode("STARTER").orElse(null);
        }
        return plan;
    }

    private void cancelStaleSelfServePendingInvoices(Long tenantId, String reason) {
        if (tenantId == null) {
            return;
        }
        List<Invoice> existingInvoices = invoiceRepository.findByTenantIdOrderByCreatedAtDesc(tenantId);
        if (existingInvoices == null || existingInvoices.isEmpty()) {
            return;
        }
        LocalDateTime now = LocalDateTime.now();
        for (Invoice inv : existingInvoices) {
            if (!"PENDING".equalsIgnoreCase(inv.getStatus()) || inv.getContractId() != null) {
                continue;
            }
            boolean isSelfServePlanChangeOrRenewal = false;
            if (invoiceLineItemRepository != null && inv.getId() != null) {
                List<InvoiceLineItem> items = invoiceLineItemRepository.findByInvoiceId(inv.getId());
                if (items != null) {
                    isSelfServePlanChangeOrRenewal = items.stream().anyMatch(item ->
                            "SUBSCRIPTION_UPGRADE".equalsIgnoreCase(item.getItemType())
                                    || "SUBSCRIPTION_RENEWAL".equalsIgnoreCase(item.getItemType()));
                }
            }
            if (!isSelfServePlanChangeOrRenewal && inv.getNotes() != null) {
                String lower = inv.getNotes().toLowerCase();
                isSelfServePlanChangeOrRenewal = lower.contains("nâng cấp") || lower.contains("gia hạn");
            }
            if (!isSelfServePlanChangeOrRenewal) {
                continue;
            }

            inv.setStatus("CANCELLED");
            String note = "Hủy tự động (" + reason + ")";
            inv.setNotes(StringUtils.hasText(inv.getNotes()) ? inv.getNotes() + " | " + note : note);
            invoiceRepository.save(inv);

            if (inv.getSubscriptionId() != null) {
                subscriptionRepository.findById(inv.getSubscriptionId()).ifPresent(sub -> {
                    if ("PENDING".equalsIgnoreCase(sub.getStatus())) {
                        sub.setStatus("CANCELED");
                        sub.setCanceledAt(now);
                        sub.setCancelReason(reason);
                        subscriptionRepository.save(sub);
                    }
                });
            }
        }
    }

    private TenantSubscription resolveCurrentTenantSubscription(TenantInfo tenant) {
        if (tenant == null || tenant.getId() == null) {
            return null;
        }
        Long tenantId = tenant.getId();
        return subscriptionRepository
                .findFirstByTenantIdAndStatusInOrderByCreatedAtDesc(tenantId, TenantQuotaRedisService.OPERATIONAL_SUBSCRIPTION_STATUSES)
                .orElseGet(() -> subscriptionRepository
                        .findFirstByTenantIdAndStatusOrderByCreatedAtDesc(tenantId, "ACTIVE")
                        .orElseGet(() -> {
                            List<TenantSubscription> allSubs = subscriptionRepository.findByTenantIdOrderByCreatedAtDesc(tenantId);
                            if (allSubs == null || allSubs.isEmpty()) {
                                return null;
                            }
                            return allSubs.stream()
                                    .filter(s -> s.getStatus() != null && TenantQuotaRedisService.OPERATIONAL_SUBSCRIPTION_STATUSES.contains(s.getStatus().toUpperCase()))
                                    .findFirst()
                                    .orElseGet(() -> allSubs.stream()
                                            .filter(s -> s.getStatus() != null && NON_PENDING_FALLBACK_STATUSES.contains(s.getStatus().toUpperCase()))
                                            .findFirst()
                                            .orElse(null));
                        }));
    }

    private String generateInvoiceNumber(LocalDateTime now) {
        return "INV-" + now.format(DateTimeFormatter.ofPattern("yyyyMM"))
                + "-" + ThreadLocalRandom.current().nextInt(1000, 9999);
    }

    private long countActiveJobsSafely() {
        try {
            return jobRepository.countByStatusInAndDeletedAtIsNull(
                    List.of(JobStatus.DRAFT, JobStatus.PUBLISHED, JobStatus.PAUSED));
        } catch (Exception e) {
            log.debug("Failed to count active jobs: {}", e.getMessage());
            return 0L;
        }
    }

    private long calculateStorageBytesSafely() {
        try {
            return cvRepository.sumTotalFileSize()
                    + interviewMessageRepository.sumTotalRecordingSize()
                    + aiAnswerRecordingRepository.sumTotalRecordingSize();
        } catch (Exception e) {
            log.debug("Failed to calculate storage bytes: {}", e.getMessage());
            return 0L;
        }
    }

    private int computePercent(long used, long max) {
        if (max < 0L) {
            return 0;
        }
        if (max == 0L) {
            return 100;
        }
        long pct = Math.round((used * 100.0) / max);
        return (int) Math.min(100L, Math.max(0L, pct));
    }

    private List<String> parseFeatures(String featuresJson) {
        if (featuresJson == null || featuresJson.isBlank()) {
            return Collections.emptyList();
        }
        try {
            JsonNode root = objectMapper.readTree(featuresJson);
            if (root.isArray()) {
                return objectMapper.convertValue(root, new TypeReference<List<String>>() {});
            } else if (root.isObject() && root.has("features") && root.get("features").isArray()) {
                return objectMapper.convertValue(root.get("features"), new TypeReference<List<String>>() {});
            }
        } catch (Exception e) {
            log.debug("Could not parse featuresJson: {}", e.getMessage());
        }
        return Collections.emptyList();
    }

    private List<TenantInvoiceItem> loadTenantInvoices(TenantInfo tenant) {
        if (tenant == null || tenant.getId() == null) {
            return Collections.emptyList();
        }
        try {
            List<Invoice> rawInvoices = invoiceRepository.findByTenantIdOrderByCreatedAtDesc(tenant.getId());
            if (rawInvoices.isEmpty()) {
                return Collections.emptyList();
            }
            Map<Long, SubscriptionPlan> planMap = planRepository.findAll().stream()
                    .collect(Collectors.toMap(SubscriptionPlan::getId, Function.identity(), (a, b) -> a));

            List<Long> invoiceIds = rawInvoices.stream().map(Invoice::getId).toList();
            Map<Long, List<InvoiceLineItem>> lineItemsByInvoice = (invoiceLineItemRepository != null && !invoiceIds.isEmpty())
                    ? invoiceLineItemRepository.findByInvoiceIdIn(invoiceIds).stream()
                            .collect(Collectors.groupingBy(InvoiceLineItem::getInvoiceId))
                    : Collections.emptyMap();

            List<TenantInvoiceItem> result = new ArrayList<>();
            for (Invoice inv : rawInvoices) {
                String invPlanCode = null;
                String invPlanName = null;
                if (inv.getSubscriptionId() != null) {
                    TenantSubscription sub = subscriptionRepository.findById(inv.getSubscriptionId()).orElse(null);
                    if (sub != null) {
                        invPlanCode = sub.getPlanCodeSnapshot();
                        invPlanName = sub.getPlanNameSnapshot();
                        if ((invPlanName == null || invPlanCode == null) && planMap.containsKey(sub.getPlanId())) {
                            SubscriptionPlan p = planMap.get(sub.getPlanId());
                            if (invPlanCode == null) invPlanCode = p.getCode();
                            if (invPlanName == null) invPlanName = p.getName();
                        }
                    }
                }
                String invoiceType = resolveInvoiceType(inv, lineItemsByInvoice.get(inv.getId()));

                result.add(TenantInvoiceItem.builder()
                        .id(inv.getId())
                        .invoiceNumber(inv.getInvoiceNumber())
                        .amount(inv.getAmount())
                        .currency(inv.getCurrency())
                        .status(inv.getStatus())
                        .dueDate(inv.getDueDate())
                        .paidAt(inv.getPaidAt())
                        .billingPeriodStart(inv.getBillingPeriodStart())
                        .billingPeriodEnd(inv.getBillingPeriodEnd())
                        .planCode(invPlanCode)
                        .planName(invPlanName)
                        .invoiceType(invoiceType)
                        .paymentGateway(inv.getPaymentGateway())
                        .notes(inv.getNotes())
                        .build());
            }
            return result;
        } catch (Exception e) {
            log.debug("Failed to load tenant invoices: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    private String resolveInvoiceType(Invoice inv, List<InvoiceLineItem> items) {
        if (items != null && !items.isEmpty()) {
            if (items.stream().anyMatch(i -> "SUBSCRIPTION_UPGRADE".equalsIgnoreCase(i.getItemType()))) {
                return "UPGRADE";
            }
            if (items.stream().anyMatch(i -> "SUBSCRIPTION_RENEWAL".equalsIgnoreCase(i.getItemType()))) {
                return "RENEWAL";
            }
            if (items.stream().anyMatch(i -> "SUBSCRIPTION".equalsIgnoreCase(i.getItemType()))) {
                return "SUBSCRIPTION";
            }
        }
        if (inv.getContractId() != null) {
            return "B2B_CONTRACT";
        }
        if (inv.getNotes() != null) {
            String lower = inv.getNotes().toLowerCase();
            if (lower.contains("nâng cấp")) return "UPGRADE";
            if (lower.contains("gia hạn")) return "RENEWAL";
        }
        return "SUBSCRIPTION";
    }
}
