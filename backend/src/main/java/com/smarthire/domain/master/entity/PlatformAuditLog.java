package com.smarthire.domain.master.entity;

import jakarta.persistence.*;
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
@Table(name = "platform_audit_logs")
public class PlatformAuditLog {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;

    @Column(name = "tenant_code", length = 64) String tenantCode;
    @Column(name = "platform_user_id") Long platformUserId;
    @Column(nullable = false, length = 64) String action;

    @Builder.Default
    @Column(nullable = false, length = 16)
    String level = "INFO";

    @Column(nullable = false, columnDefinition = "TEXT") String description;
    @Column(name = "ip_address", length = 64) String ipAddress;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "metadata_json", columnDefinition = "jsonb")
    String metadataJson;

    @Builder.Default
    @Column(name = "created_at", nullable = false, updatable = false)
    LocalDateTime createdAt = LocalDateTime.now();
}
