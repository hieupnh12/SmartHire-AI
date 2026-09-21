package com.smarthire.domain.tenant.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(
        name = "role_permissions",
        uniqueConstraints = @UniqueConstraint(name = "uk_role_permissions_role_feature", columnNames = {"role", "feature_code"})
)
public class RolePermission extends BaseEntity {

    @Column(nullable = false, length = 64)
    private String role;

    @Column(name = "feature_code", nullable = false, length = 64)
    private String featureCode;

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getFeatureCode() {
        return featureCode;
    }

    public void setFeatureCode(String featureCode) {
        this.featureCode = featureCode;
    }
}
