package com.smarthire.domain.master.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

@Entity
@Table(name = "master_notification_logs")
@Builder
@Data
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class MasterNotificationLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @Column(name = "tenant_code", nullable = false, length = 64)
    String tenantCode;

    @Column(nullable = false, length = 64)
    String type; // INVOICE_CREATED, QUOTA_WARNING, SUBSCRIPTION_EXPIRY

    @Column(name = "to_email", nullable = false, length = 128)
    String toEmail;

    @Column(nullable = false, length = 32)
    String status; // SUCCESS, FAILED

    @Column(name = "error_message", columnDefinition = "TEXT")
    String errorMessage;

    @Builder.Default
    @Column(name = "sent_at", nullable = false, updatable = false)
    LocalDateTime sentAt = LocalDateTime.now();
}
