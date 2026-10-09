package com.smarthire.domain.master.entity;

import jakarta.persistence.*;
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
@Table(name = "master_consent_logs")
public class MasterConsentLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @Column(name = "tenant_id")
    Long tenantId;

    @Column(name = "invoice_id")
    Long invoiceId;

    @Column(name = "actor_name", nullable = false, length = 255)
    String actorName;

    @Column(name = "actor_email", nullable = false, length = 255)
    String actorEmail;

    @Column(name = "policy_type", nullable = false, length = 64)
    String policyType;

    @Column(name = "policy_version", nullable = false, length = 32)
    String policyVersion;

    @Builder.Default
    @Column(name = "is_accepted", nullable = false)
    boolean accepted = true;

    @Column(name = "ip_address", nullable = false, length = 64)
    String ipAddress;

    @Column(name = "user_agent", columnDefinition = "TEXT")
    String userAgent;

    @Builder.Default
    @Column(name = "consent_context", nullable = false, length = 64)
    String consentContext = "SELF_SERVE_CHECKOUT";

    @Builder.Default
    @Column(name = "created_at", nullable = false, updatable = false)
    LocalDateTime createdAt = LocalDateTime.now();

    @PrePersist
    void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
