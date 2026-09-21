package com.smarthire.domain.master.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Entity
@Table(name = "ai_model_configs")
@Builder
@Data
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AiModelConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @Column(name = "task_type", nullable = false, unique = true, length = 60)
    String taskType; // CV_PARSING, INTERVIEW_GEN, INTERVIEW_NLP, CODE_GRADING, MATCHING

    @Column(name = "task_name", nullable = false, length = 100)
    String taskName;

    @Builder.Default
    @Column(nullable = false, length = 50)
    String provider = "GEMINI";

    @Column(name = "model_name", nullable = false, length = 100)
    String modelName;

    @Builder.Default
    @Column(nullable = false, precision = 3, scale = 2)
    BigDecimal temperature = new BigDecimal("0.20");

    @Builder.Default
    @Column(name = "max_tokens", nullable = false)
    Integer maxTokens = 2048;

    @Builder.Default
    @Column(name = "timeout_seconds", nullable = false)
    Integer timeoutSeconds = 30;

    @Column(name = "failover_provider", length = 50)
    String failoverProvider;

    @Column(name = "failover_model", length = 100)
    String failoverModel;

    @Builder.Default
    @Column(name = "is_active", nullable = false)
    Boolean isActive = true;

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
