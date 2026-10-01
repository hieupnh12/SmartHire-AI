package com.smarthire.master.tenant.dto;

import com.smarthire.domain.master.entity.TenantInfo;
import java.time.LocalDateTime;

public record TenantResponse(Long id, String code, String name, String subdomain, String dbName,
                             String status, String environmentType, LocalDateTime createdAt,
                             String contactName, String contactEmail, String contactPhone, String billingEmail,
                             String companyLegalName, String taxCode, String address, String website,
                             String industry, String companySize, boolean managedDatabase) {
    public static TenantResponse from(TenantInfo tenant) {
        return new TenantResponse(tenant.getId(), tenant.getCode(), tenant.getName(), tenant.getSubdomain(),
                tenant.getDbName(), tenant.getStatus(), tenant.getEnvironmentType(), tenant.getCreatedAt(),
                tenant.getContactName(), tenant.getContactEmail(), tenant.getContactPhone(), tenant.getBillingEmail(),
                tenant.getCompanyLegalName(), tenant.getTaxCode(), tenant.getAddress(), tenant.getWebsite(),
                tenant.getIndustry(), tenant.getCompanySize(), tenant.isManagedDatabase());
    }
}
