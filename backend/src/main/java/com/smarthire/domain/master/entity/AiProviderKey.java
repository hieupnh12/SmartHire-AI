package com.smarthire.domain.master.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Entity
@Table(name = "ai_provider_keys")
@Builder
@Data
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AiProviderKey {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @Column(nullable = false, length = 50)
    String provider; // GEMINI, OPENAI, ANTHROPIC, DEEPSEEK

    @Column(name = "key_alias", nullable = false, length = 100)
    String keyAlias;

    @Column(name = "api_key_encrypted", nullable = false, columnDefinition = "TEXT")
    String apiKeyEncrypted;

    @Column(name = "endpoint_url", length = 255)
    String endpointUrl;

    @Builder.Default
    @Column(nullable = false, length = 30)
    String status = "ACTIVE"; // ACTIVE, EXPIRED, RATE_LIMITED, INACTIVE

    @Builder.Default
    @Column(name = "is_default", nullable = false)
    Boolean isDefault = false;

    @Column(name = "last_tested_at")
    LocalDateTime lastTestedAt;

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
