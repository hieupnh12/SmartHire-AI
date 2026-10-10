package com.smarthire.domain.master.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "tenant_subscriptions")
public class TenantSubscription {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;

    @Column(name = "tenant_id", nullable = false) Long tenantId;
    @Column(name = "plan_id", nullable = false) Long planId;

    @Builder.Default
    @Column(nullable = false, length = 32)
    String status = "ACTIVE";

    @Builder.Default
    @Column(name = "starts_at", nullable = false)
    LocalDateTime startsAt = LocalDateTime.now();

    @Column(name = "ends_at") LocalDateTime endsAt;

    @Builder.Default
    @Column(name = "auto_renew", nullable = false)
    boolean autoRenew = true;

    // --- Tier 2 Snapshot Fields (Immutable during contract term) ---
    @Column(name = "plan_code_snapshot", length = 64)
    String planCodeSnapshot;

    @Column(name = "plan_name_snapshot", length = 128)
    String planNameSnapshot;

    @Builder.Default
    @Column(name = "plan_version_snapshot", nullable = false)
    Integer planVersionSnapshot = 1;

    @Column(name = "contracted_price_yearly", precision = 15, scale = 2)
    BigDecimal contractedPriceYearly;

    @Column(name = "snapshot_max_jobs")
    Integer snapshotMaxJobs;

    @Column(name = "snapshot_max_cv_parses")
    Integer snapshotMaxCvParses;

    @Column(name = "snapshot_max_ai_interview_hours")
    Integer snapshotMaxAiInterviewHours;

    @Column(name = "snapshot_max_storage_gb")
    Integer snapshotMaxStorageGb;

    @Column(name = "snapshot_max_proctoring_hours")
    Integer snapshotMaxProctoringHours;

    @Column(name = "snapshot_video_retention_days")
    Integer snapshotVideoRetentionDays;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "snapshot_features_json", columnDefinition = "jsonb")
    String snapshotFeaturesJson;

    // --- Lifecycle State Machine & Upgrade/Downgrade Fields ---
    @Column(name = "grace_period_ends_at")
    LocalDateTime gracePeriodEndsAt;

    @Column(name = "next_plan_id")
    Long nextPlanId;

    @Builder.Default
    @Column(name = "prorated_credit_amount", nullable = false, precision = 15, scale = 2)
    BigDecimal proratedCreditAmount = BigDecimal.ZERO;

    @Column(name = "upgraded_from_subscription_id")
    Long upgradedFromSubscriptionId;

    @Column(name = "canceled_at")
    LocalDateTime canceledAt;

    @Column(name = "cancel_reason", length = 255)
    String cancelReason;

    @Builder.Default
    @Column(name = "created_at", nullable = false, updatable = false)
    LocalDateTime createdAt = LocalDateTime.now();

    @Builder.Default
    @Column(name = "updated_at", nullable = false)
    LocalDateTime updatedAt = LocalDateTime.now();

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    /**
     * Copies all pricing, quotas, and features from the catalog plan into this subscription instance snapshot.
     */
    public void applyPlanSnapshot(SubscriptionPlan plan) {
        if (plan == null) {
            return;
        }
        this.planId = plan.getId() != null ? plan.getId() : this.planId;
        this.planCodeSnapshot = plan.getCode();
        this.planNameSnapshot = plan.getName();
        this.planVersionSnapshot = plan.getVersion() != null ? plan.getVersion() : 1;
        this.contractedPriceYearly = plan.getPriceYearly();
        this.snapshotMaxJobs = plan.getMaxJobs();
        this.snapshotMaxCvParses = plan.getMaxCvParses();
        this.snapshotMaxAiInterviewHours = plan.getMaxAiInterviewHours();
        this.snapshotMaxStorageGb = plan.getMaxStorageGb();
        this.snapshotMaxProctoringHours = plan.getMaxProctoringHours();
        this.snapshotVideoRetentionDays = plan.getVideoRetentionDays();
        this.snapshotFeaturesJson = plan.getFeaturesJson();
    }
}
