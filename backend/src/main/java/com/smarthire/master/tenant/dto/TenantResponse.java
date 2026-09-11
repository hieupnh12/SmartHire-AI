package com.smarthire.master.tenant.dto;

import com.smarthire.domain.master.entity.TenantInfo;
import java.time.LocalDateTime;

public record TenantResponse(Long id, String code, String name, String subdomain, String dbName,
                             String status, LocalDateTime createdAt) {
    public static TenantResponse from(TenantInfo tenant) {
        return new TenantResponse(tenant.getId(), tenant.getCode(), tenant.getName(), tenant.getSubdomain(),
                tenant.getDbName(), tenant.getStatus(), tenant.getCreatedAt());
    }
}
