package com.smarthire.master.tenant.dto;

import jakarta.validation.constraints.NotBlank;

public class OnboardTenantRequest {

    @NotBlank(message = "Tenant code is required")
    private String code;

    @NotBlank(message = "Tenant name is required")
    private String name;

    @NotBlank(message = "Subdomain is required")
    private String subdomain;

    private String customDbUrl;
    private String dbUsername;
    private String dbPassword;

    public OnboardTenantRequest() {}

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getSubdomain() { return subdomain; }
    public void setSubdomain(String subdomain) { this.subdomain = subdomain; }

    public String getCustomDbUrl() { return customDbUrl; }
    public void setCustomDbUrl(String customDbUrl) { this.customDbUrl = customDbUrl; }

    public String getDbUsername() { return dbUsername; }
    public void setDbUsername(String dbUsername) { this.dbUsername = dbUsername; }

    public String getDbPassword() { return dbPassword; }
    public void setDbPassword(String dbPassword) { this.dbPassword = dbPassword; }
}
