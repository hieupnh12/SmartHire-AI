package com.smarthire.master.subscription;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.domain.enums.JobStatus;
import com.smarthire.domain.master.entity.Invoice;
import com.smarthire.domain.master.entity.SubscriptionPlan;
import com.smarthire.domain.master.entity.TenantInfo;
import com.smarthire.domain.master.entity.TenantSubscription;
import com.smarthire.domain.master.repository.InvoiceRepository;
import com.smarthire.domain.master.repository.SubscriptionPlanRepository;
import com.smarthire.domain.master.repository.TenantInfoRepository;
import com.smarthire.domain.master.repository.TenantSubscriptionRepository;
import com.smarthire.domain.tenant.repository.AiAnswerRecordingRepository;
import com.smarthire.domain.tenant.repository.CvRepository;
import com.smarthire.domain.tenant.repository.InterviewMessageRepository;
import com.smarthire.domain.tenant.repository.JobRepository;
import com.smarthire.master.subscription.dto.CloneCustomPlanRequest;
import com.smarthire.master.subscription.dto.SubscriptionPlanResponse;
import com.smarthire.master.subscription.dto.UpdateSubscriptionPlanRequest;
import com.smarthire.master.subscription.mapper.SubscriptionPlanMapper;
import com.smarthire.master.subscription.service.MasterSubscriptionService;
import com.smarthire.multitenancy.context.TenantContext;
import com.smarthire.multitenancy.quota.TenantQuotaRedisService;
import com.smarthire.tenant.company.dto.SubscriptionChangePreviewResponse;
import com.smarthire.tenant.company.dto.SubscriptionChangeRequest;
import com.smarthire.tenant.company.service.TenantSubscriptionQuotaService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TwoTierSubscriptionArchitectureTest {

    @Mock
    private SubscriptionPlanRepository planRepository;
    @Mock
    private SubscriptionPlanMapper planMapper;
    @Mock
    private TenantSubscriptionRepository subscriptionRepository;
    @Mock
    private TenantInfoRepository tenantInfoRepository;
    @Mock
    private InvoiceRepository invoiceRepository;
    @Mock
    private TenantQuotaRedisService quotaRedisService;
    @Mock
    private JobRepository jobRepository;
    @Mock
    private CvRepository cvRepository;
    @Mock
    private InterviewMessageRepository interviewMessageRepository;
    @Mock
    private AiAnswerRecordingRepository aiAnswerRecordingRepository;

    private MasterSubscriptionService masterSubscriptionService;
    private TenantSubscriptionQuotaService tenantSubscriptionQuotaService;

    @BeforeEach
    void setUp() {
        masterSubscriptionService = new MasterSubscriptionService(planRepository, planMapper);
        ReflectionTestUtils.setField(masterSubscriptionService, "subscriptionRepository", subscriptionRepository);
        ReflectionTestUtils.setField(masterSubscriptionService, "tenantInfoRepository", tenantInfoRepository);
        ReflectionTestUtils.setField(masterSubscriptionService, "quotaRedisService", quotaRedisService);

        lenient().when(planMapper.toResponse(any(SubscriptionPlan.class))).thenAnswer(inv -> {
            SubscriptionPlan p = inv.getArgument(0);
            return SubscriptionPlanResponse.builder()
                    .id(p.getId())
                    .code(p.getCode())
                    .name(p.getName())
                    .description(p.getDescription())
                    .priceYearly(p.getPriceYearly())
                    .maxJobs(p.getMaxJobs())
                    .maxCvParses(p.getMaxCvParses())
                    .maxAiInterviewHours(p.getMaxAiInterviewHours())
                    .maxStorageGb(p.getMaxStorageGb())
                    .maxProctoringHours(p.getMaxProctoringHours())
                    .videoRetentionDays(p.getVideoRetentionDays())
                    .featuresJson(p.getFeaturesJson())
                    .status(p.getStatus())
                    .version(p.getVersion())
                    .parentPlanId(p.getParentPlanId())
                    .custom(p.isCustom())
                    .targetTenantId(p.getTargetTenantId())
                    .archived(p.isArchived())
                    .build();
        });

        tenantSubscriptionQuotaService = new TenantSubscriptionQuotaService(
                tenantInfoRepository,
                subscriptionRepository,
                planRepository,
                invoiceRepository,
                quotaRedisService,
                jobRepository,
                cvRepository,
                interviewMessageRepository,
                aiAnswerRecordingRepository,
                new ObjectMapper()
        );
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Test
    void tier1PlanVersioning_WhenPlanHasSubscribers_ArchivesV1AndCreatesNewVersionV2() {
        SubscriptionPlan proV1 = SubscriptionPlan.builder()
                .id(2L)
                .code("PRO")
                .name("Professional")
                .version(1)
                .priceYearly(BigDecimal.valueOf(30_000_000L))
                .maxJobs(15)
                .maxCvParses(1000)
                .maxAiInterviewHours(20)
                .maxStorageGb(25)
                .maxProctoringHours(50)
                .videoRetentionDays(60)
                .status("ACTIVE")
                .archived(false)
                .custom(false)
                .build();

        when(planRepository.findById(2L)).thenReturn(Optional.of(proV1));
        when(subscriptionRepository.existsByPlanId(2L)).thenReturn(true);
        when(planRepository.saveAndFlush(any(SubscriptionPlan.class))).thenAnswer(inv -> inv.getArgument(0));
        when(planRepository.save(any(SubscriptionPlan.class))).thenAnswer(inv -> {
            SubscriptionPlan saved = inv.getArgument(0);
            if (saved.getId() == null) {
                saved.setId(22L);
            }
            return saved;
        });

        UpdateSubscriptionPlanRequest updateRequest = UpdateSubscriptionPlanRequest.builder()
                .name("Professional V2")
                .description("Updated Pro Plan")
                .priceYearly(BigDecimal.valueOf(50_000_000L))
                .maxJobs(10)
                .maxCvParses(800)
                .maxAiInterviewHours(15)
                .maxStorageGb(20)
                .maxProctoringHours(40)
                .videoRetentionDays(30)
                .featuresJson("{\"features\":[\"AI Voice Interview\"]}")
                .build();

        SubscriptionPlanResponse response = masterSubscriptionService.updatePlan(2L, updateRequest);

        // Old V1 is archived and keeps its original 30M price & 15 maxJobs for grandfathered customers
        assertThat(proV1.getStatus()).isEqualTo("ARCHIVED");
        assertThat(proV1.isArchived()).isTrue();
        assertThat(proV1.getCode()).isEqualTo("PRO_V1_2");
        assertThat(proV1.getPriceYearly()).isEqualByComparingTo("30000000");
        assertThat(proV1.getMaxJobs()).isEqualTo(15);

        // New V2 takes over canonical code "PRO" with new 50M price & 10 maxJobs
        assertThat(response.getId()).isEqualTo(22L);
        assertThat(response.getCode()).isEqualTo("PRO");
        assertThat(response.getVersion()).isEqualTo(2);
        assertThat(response.getParentPlanId()).isEqualTo(2L);
        assertThat(response.getPriceYearly()).isEqualByComparingTo("50000000");
        assertThat(response.getMaxJobs()).isEqualTo(10);
        assertThat(response.getStatus()).isEqualTo("ACTIVE");
        assertThat(response.isArchived()).isFalse();
    }

    @Test
    void tier1CustomEnterprisePlan_ClonesTemplateForTargetTenantOnly() {
        SubscriptionPlan enterpriseTemplate = SubscriptionPlan.builder()
                .id(3L)
                .code("ENTERPRISE")
                .name("Enterprise")
                .version(1)
                .priceYearly(BigDecimal.valueOf(120_000_000L))
                .maxJobs(-1)
                .maxCvParses(-1)
                .maxAiInterviewHours(100)
                .maxStorageGb(200)
                .maxProctoringHours(200)
                .videoRetentionDays(365)
                .featuresJson("{\"features\":[\"SSO\",\"Dedicated DB\"]}")
                .status("ACTIVE")
                .build();

        TenantInfo targetTenant = new TenantInfo();
        targetTenant.setId(99L);
        targetTenant.setCode("fpt-software");
        targetTenant.setName("FPT Software");

        when(planRepository.findById(3L)).thenReturn(Optional.of(enterpriseTemplate));
        when(tenantInfoRepository.findById(99L)).thenReturn(Optional.of(targetTenant));
        when(planRepository.save(any(SubscriptionPlan.class))).thenAnswer(inv -> {
            SubscriptionPlan saved = inv.getArgument(0);
            saved.setId(105L);
            return saved;
        });

        CloneCustomPlanRequest cloneRequest = CloneCustomPlanRequest.builder()
                .targetTenantId(99L)
                .description("Hợp đồng Enterprise riêng cho FPT Software")
                .priceYearly(BigDecimal.valueOf(95_000_000L))
                .maxJobs(50)
                .maxCvParses(5000)
                .maxAiInterviewHours(250)
                .maxStorageGb(500)
                .maxProctoringHours(300)
                .videoRetentionDays(730)
                .activateImmediately(false)
                .build();

        SubscriptionPlanResponse customPlan = masterSubscriptionService.cloneCustomPlanForTenant(3L, cloneRequest);

        assertThat(customPlan.getId()).isEqualTo(105L);
        assertThat(customPlan.isCustom()).isTrue();
        assertThat(customPlan.getTargetTenantId()).isEqualTo(99L);
        assertThat(customPlan.getParentPlanId()).isEqualTo(3L);
        assertThat(customPlan.getPriceYearly()).isEqualByComparingTo("95000000");
        assertThat(customPlan.getMaxJobs()).isEqualTo(50);
        assertThat(customPlan.getMaxAiInterviewHours()).isEqualTo(250);
    }

    @Test
    void tier2UpgradeProrationAndDowngradeSchedule_CalculatesCreditAndSchedulesEndOfCycle() {
        TenantContext.setCurrentTenant("acme");

        TenantInfo tenant = new TenantInfo();
        tenant.setId(10L);
        tenant.setCode("acme");

        SubscriptionPlan starterPlan = SubscriptionPlan.builder()
                .id(1L)
                .code("STARTER")
                .name("Starter")
                .version(1)
                .priceYearly(BigDecimal.valueOf(24_000_000L))
                .maxJobs(5)
                .maxCvParses(200)
                .maxAiInterviewHours(0)
                .maxStorageGb(5)
                .maxProctoringHours(0)
                .videoRetentionDays(0)
                .status("ACTIVE")
                .build();

        SubscriptionPlan proPlan = SubscriptionPlan.builder()
                .id(2L)
                .code("PRO")
                .name("Professional")
                .version(1)
                .priceYearly(BigDecimal.valueOf(60_000_000L))
                .maxJobs(20)
                .maxCvParses(2000)
                .maxAiInterviewHours(30)
                .maxStorageGb(50)
                .maxProctoringHours(60)
                .videoRetentionDays(90)
                .status("ACTIVE")
                .build();

        // Tenant is halfway through a 360-day cycle on Starter (180 days remaining)
        LocalDateTime now = LocalDateTime.now();
        TenantSubscription currentSub = TenantSubscription.builder()
                .id(500L)
                .tenantId(10L)
                .planId(1L)
                .status("ACTIVE")
                .startsAt(now.minusDays(180))
                .endsAt(now.plusDays(180))
                .build();
        currentSub.applyPlanSnapshot(starterPlan);

        when(tenantInfoRepository.findByCode("acme")).thenReturn(Optional.of(tenant));
        when(subscriptionRepository.findFirstByTenantIdAndStatusInOrderByCreatedAtDesc(anyLong(), any()))
                .thenReturn(Optional.of(currentSub));
        when(planRepository.findById(1L)).thenReturn(Optional.of(starterPlan));
        lenient().when(planRepository.findById(2L)).thenReturn(Optional.of(proPlan));
        when(planRepository.findByCode("PRO")).thenReturn(Optional.of(proPlan));
        lenient().when(planRepository.findByCode("STARTER")).thenReturn(Optional.of(starterPlan));
        lenient().when(jobRepository.countByStatusInAndDeletedAtIsNull(any())).thenReturn(4L);

        // 1. Preview Upgrade from STARTER (24M) to PRO (60M) with ~50% cycle remaining
        SubscriptionChangePreviewResponse upgradePreview = tenantSubscriptionQuotaService.previewPlanChange("PRO");

        assertThat(upgradePreview.getChangeType()).isEqualTo("UPGRADE");
        assertThat(upgradePreview.getEffectiveTiming()).isEqualTo("IMMEDIATE");
        assertThat(upgradePreview.getRemainingDays()).isBetween(179L, 181L);
        assertThat(upgradePreview.getProratedCreditAmount()).isBetween(
                BigDecimal.valueOf(11_500_000L),
                BigDecimal.valueOf(12_500_000L)
        );
        assertThat(upgradePreview.getNetAmountDue()).isEqualByComparingTo(
                BigDecimal.valueOf(60_000_000L).subtract(upgradePreview.getProratedCreditAmount())
        );

        // 2. Execute Upgrade -> creates new snapshot subscription + proration invoice
        when(subscriptionRepository.save(any(TenantSubscription.class))).thenAnswer(inv -> inv.getArgument(0));
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(inv -> inv.getArgument(0));

        tenantSubscriptionQuotaService.executePlanChange(new SubscriptionChangeRequest("PRO", "Nâng cấp lên gói Pro"));

        assertThat(currentSub.getStatus()).isEqualTo("CANCELED");
        ArgumentCaptor<TenantSubscription> subCaptor = ArgumentCaptor.forClass(TenantSubscription.class);
        verify(subscriptionRepository, times(2)).save(subCaptor.capture());
        TenantSubscription upgradedSub = subCaptor.getAllValues().get(1);
        assertThat(upgradedSub.getPlanId()).isEqualTo(2L);
        assertThat(upgradedSub.getPlanCodeSnapshot()).isEqualTo("PRO");
        assertThat(upgradedSub.getSnapshotMaxJobs()).isEqualTo(20);
        assertThat(upgradedSub.getUpgradedFromSubscriptionId()).isEqualTo(500L);
        assertThat(upgradedSub.getProratedCreditAmount()).isPositive();

        // 3. Preview Downgrade from PRO (20 maxJobs) to STARTER (5 maxJobs) when 8 jobs are open
        upgradedSub.setId(501L);
        when(subscriptionRepository.findFirstByTenantIdAndStatusInOrderByCreatedAtDesc(anyLong(), any()))
                .thenReturn(Optional.of(upgradedSub));
        when(jobRepository.countByStatusInAndDeletedAtIsNull(any())).thenReturn(8L);

        SubscriptionChangePreviewResponse downgradePreview = tenantSubscriptionQuotaService.previewPlanChange("STARTER");
        assertThat(downgradePreview.getChangeType()).isEqualTo("DOWNGRADE");
        assertThat(downgradePreview.getEffectiveTiming()).isEqualTo("END_OF_CYCLE");
        assertThat(downgradePreview.getProratedCreditAmount()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(downgradePreview.getWarnings()).isNotEmpty();
        assertThat(downgradePreview.getWarnings().get(0)).contains("8 vị trí tuyển dụng");
    }
}
