package com.smarthire.domain.master.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Entity
@Table(name = "contract_signatures")
@Builder
@Data
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ContractSignature {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @Column(name = "contract_id", nullable = false)
    Long contractId;

    @Column(name = "signer_name", nullable = false)
    String signerName;

    @Column(name = "signer_email", nullable = false)
    String signerEmail;

    @Column(name = "signer_title", nullable = false, length = 128)
    String signerTitle;

    @Builder.Default
    @Column(nullable = false, length = 32)
    String status = "PENDING";

    @Column(name = "signed_at")
    LocalDateTime signedAt;

    @Column(name = "otp_code", length = 10)
    String otpCode;

    @Column(name = "otp_expires_at")
    LocalDateTime otpExpiresAt;

    @Column(name = "client_ip", length = 64)
    String clientIp;

    @Column(name = "external_signature_id", length = 128)
    String externalSignatureId;

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
