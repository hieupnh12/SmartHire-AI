package com.smarthire.domain.master.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "tenants")
public class TenantInfo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 64)
    private String code;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true, length = 128)
    private String subdomain;

    @Column(name = "db_name", nullable = false, unique = true, length = 128)
    private String dbName;

    @Column(name = "db_url", length = 512)
    private String dbUrl;

    @Column(name = "db_username", length = 128)
    private String dbUsername;

    @Column(name = "db_password")
    private String dbPassword;

    @Column(nullable = false, length = 32)
    private String status = "ACTIVE";

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    public TenantInfo() {}

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getSubdomain() { return subdomain; }
    public void setSubdomain(String subdomain) { this.subdomain = subdomain; }

    public String getDbName() { return dbName; }
    public void setDbName(String dbName) { this.dbName = dbName; }

    public String getDbUrl() { return dbUrl; }
    public void setDbUrl(String dbUrl) { this.dbUrl = dbUrl; }

    public String getDbUsername() { return dbUsername; }
    public void setDbUsername(String dbUsername) { this.dbUsername = dbUsername; }

    public String getDbPassword() { return dbPassword; }
    public void setDbPassword(String dbPassword) { this.dbPassword = dbPassword; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
