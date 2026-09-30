package com.smarthire.domain.master.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "tenant_usage_daily")
public class TenantUsageDaily {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;

    @Column(name = "tenant_id", nullable = false) Long tenantId;
    @Column(name = "usage_date", nullable = false) LocalDate usageDate;

    @Builder.Default
    @Column(name = "cv_parses_count", nullable = false)
    Integer cvParsesCount = 0;

    @Builder.Default
    @Column(name = "ai_voice_seconds", nullable = false)
    Integer aiVoiceSeconds = 0;

    @Builder.Default
    @Column(name = "proctoring_seconds", nullable = false)
    Integer proctoringSeconds = 0;

    @Builder.Default
    @Column(name = "storage_bytes", nullable = false)
    Long storageBytes = 0L;

    @Builder.Default
    @Column(name = "active_jobs_count", nullable = false)
    Integer activeJobsCount = 0;

    @Builder.Default
    @Column(name = "ai_tokens_consumed", nullable = false)
    Long aiTokensConsumed = 0L;

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
