package com.smarthire.domain.master.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Entity
@Table(name = "ai_model_pricings")
@Builder
@Data
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AiModelPricing {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @Column(nullable = false, length = 50)
    String provider;

    @Column(name = "model_name", nullable = false, length = 100)
    String modelName;

    @Builder.Default
    @Column(name = "input_price_per_1m_tokens", nullable = false, precision = 12, scale = 4)
    BigDecimal inputPricePer1mTokens = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "output_price_per_1m_tokens", nullable = false, precision = 12, scale = 4)
    BigDecimal outputPricePer1mTokens = BigDecimal.ZERO;

    @Column(name = "display_name", length = 100)
    String displayName;

    @Builder.Default
    @Column(name = "context_window", nullable = false)
    Integer contextWindow = 128000;

    @Builder.Default
    @Column(name = "supports_json", nullable = false)
    Boolean supportsJson = true;

    @Builder.Default
    @Column(name = "is_active", nullable = false)
    Boolean isActive = true;

    @Builder.Default
    @Column(name = "updated_at", nullable = false)
    LocalDateTime updatedAt = LocalDateTime.now();

    @PrePersist
    public void prePersist() {
        if (updatedAt == null) updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
