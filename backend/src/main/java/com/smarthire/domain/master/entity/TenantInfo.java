package com.smarthire.domain.master.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

@Entity
@Table(name = "tenants")
@Builder
@Data
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class TenantInfo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @Column(nullable = false, unique = true, length = 64)
    String code;

    @Column(nullable = false)
    String name;

    @Column(name = "contact_email")
    String contactEmail;

    @Column(name = "contact_name")
    String contactName;

    @Column(name = "contact_phone")
    String contactPhone;

    @Column(name = "billing_email")
    String billingEmail;

    @Column(nullable = false, unique = true, length = 128)
    String subdomain;

    @Column(name = "db_name", nullable = false, unique = true, length = 128)
    String dbName;

    @Column(name = "db_url", length = 512)
    String dbUrl;

    @Column(name = "db_username", length = 128)
    String dbUsername;

    @JsonIgnore
    @Column(name = "db_password", length = 1024)
    String dbPassword;

    @Column(name = "managed_database", nullable = false)
    boolean managedDatabase;

    @Builder.Default
    @Column(nullable = false, length = 32)
    String status = "ACTIVE";

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
