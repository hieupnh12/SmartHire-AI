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
@Table(name = "subscription_plans")
public class SubscriptionPlan {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;

    @Column(nullable = false, unique = true, length = 64) String code;
    @Column(nullable = false, length = 128) String name;
    String description;

    @Builder.Default
    @Column(name = "price_monthly", nullable = false)
    BigDecimal priceMonthly = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "price_yearly", nullable = false)
    BigDecimal priceYearly = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "max_jobs", nullable = false)
    Integer maxJobs = 5;

    @Builder.Default
    @Column(name = "max_cv_parses", nullable = false)
    Integer maxCvParses = 100;

    @Builder.Default
    @Column(name = "max_ai_interview_hours", nullable = false)
    Integer maxAiInterviewHours = 10;

    @Builder.Default
    @Column(name = "max_storage_gb", nullable = false)
    Integer maxStorageGb = 5;

    @Builder.Default
    @Column(name = "max_proctoring_hours", nullable = false)
    Integer maxProctoringHours = 0;

    @Builder.Default
    @Column(name = "video_retention_days", nullable = false)
    Integer videoRetentionDays = 30;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "features_json", columnDefinition = "jsonb")
    String featuresJson;

    @Builder.Default
    @Column(name = "is_deleted", nullable = false)
    boolean deleted = false;

    @Column(name = "deleted_at") LocalDateTime deletedAt;

    @Builder.Default
    @Column(nullable = false, length = 32)
    String status = "ACTIVE";

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
}
