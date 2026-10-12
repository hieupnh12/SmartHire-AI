package com.smarthire.domain.master.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Entity
@Table(name = "tenant_ai_usage_daily")
@Builder
@Data
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class TenantAiUsageDaily {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @Column(name = "tenant_id", nullable = false)
    Long tenantId;

    @Column(name = "usage_date", nullable = false)
    LocalDate usageDate;

    @Column(name = "task_type", nullable = false, length = 50)
    String taskType;

    @Column(nullable = false, length = 50)
    String provider;

    @Column(name = "model_name", nullable = false, length = 100)
    String modelName;

    @Builder.Default
    @Column(name = "total_requests", nullable = false)
    Integer totalRequests = 0;

    @Builder.Default
    @Column(name = "failed_requests", nullable = false)
    Integer failedRequests = 0;

    @Builder.Default
    @Column(name = "total_prompt_tokens", nullable = false)
    Long totalPromptTokens = 0L;

    @Builder.Default
    @Column(name = "total_completion_tokens", nullable = false)
    Long totalCompletionTokens = 0L;

    @Builder.Default
    @Column(name = "estimated_cost_usd", nullable = false, precision = 12, scale = 6)
    BigDecimal estimatedCostUsd = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "total_latency_ms", nullable = false)
    Long totalLatencyMs = 0L;

    @Builder.Default
    @Column(name = "created_at", nullable = false, updatable = false)
    LocalDateTime createdAt = LocalDateTime.now();

    @Builder.Default
    @Column(name = "updated_at", nullable = false)
    LocalDateTime updatedAt = LocalDateTime.now();

    @PrePersist
    public void prePersist() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (updatedAt == null) updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
