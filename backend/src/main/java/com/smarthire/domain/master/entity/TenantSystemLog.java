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
@Table(name = "tenant_system_logs")
public class TenantSystemLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @Builder.Default
    @Column(name = "tenant_code", nullable = false, length = 64)
    String tenantCode = "SYSTEM";

    @Builder.Default
    @Column(nullable = false, length = 16)
    String level = "ERROR";

    @Builder.Default
    @Column(nullable = false, length = 64)
    String category = "APPLICATION";

    @Column(nullable = false, length = 64)
    String action;

    @Column(nullable = false, columnDefinition = "TEXT")
    String message;

    @Column(length = 255)
    String endpoint;

    @Column(length = 16)
    String method;

    @Column(name = "status_code")
    Integer statusCode;

    @Column(name = "ip_address", length = 64)
    String ipAddress;

    @Column(name = "trace_id", length = 64)
    String traceId;

    @Column(name = "stack_trace", columnDefinition = "TEXT")
    String stackTrace;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "metadata_json", columnDefinition = "jsonb")
    String metadataJson;

    @Builder.Default
    @Column(name = "created_at", nullable = false, updatable = false)
    LocalDateTime createdAt = LocalDateTime.now();
}
