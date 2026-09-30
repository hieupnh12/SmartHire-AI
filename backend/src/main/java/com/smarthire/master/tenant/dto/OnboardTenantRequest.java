package com.smarthire.master.tenant.dto;

import jakarta.validation.constraints.*;
import com.fasterxml.jackson.annotation.JsonProperty;

public class OnboardTenantRequest extends TenantAdminRequest {
    @NotBlank @Pattern(regexp = "[a-z][a-z0-9-]{1,31}")
    private String code;
    @NotBlank @Size(max = 255)
    private String name;
    @NotBlank @Pattern(regexp = "[a-z][a-z0-9-]{1,61}[a-z0-9]")
    private String subdomain;
    @Size(max = 512)
    private String customDbUrl;
    @Size(max = 32)
    private String dbUsername;
    @Size(max = 256)
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private String dbPassword;
    private String environmentType;

    @Size(max = 255)
    private String companyLegalName;
    @Size(max = 50)
    private String taxCode;
    @Size(max = 512)
    private String billingAddress;
    @Email @Size(max = 255)
    private String billingEmail;

    public String getCode() { return code; }
    public void setCode(String value) { code = value; }
    public String getName() { return name; }
    public void setName(String value) { name = value; }
    public String getSubdomain() { return subdomain; }
    public void setSubdomain(String value) { subdomain = value; }
    public String getCustomDbUrl() { return customDbUrl; }
    public void setCustomDbUrl(String value) { customDbUrl = value; }
    public String getDbUsername() { return dbUsername; }
    public void setDbUsername(String value) { dbUsername = value; }
    public String getDbPassword() { return dbPassword; }
    public void setDbPassword(String value) { dbPassword = value; }
    public String getEnvironmentType() { return environmentType; }
    public void setEnvironmentType(String value) { environmentType = value; }
    
    public String getCompanyLegalName() { return companyLegalName; }
    public void setCompanyLegalName(String value) { companyLegalName = value; }
    public String getTaxCode() { return taxCode; }
    public void setTaxCode(String value) { taxCode = value; }
    public String getBillingAddress() { return billingAddress; }
    public void setBillingAddress(String value) { billingAddress = value; }
    public String getBillingEmail() { return billingEmail; }
    public void setBillingEmail(String value) { billingEmail = value; }
}
