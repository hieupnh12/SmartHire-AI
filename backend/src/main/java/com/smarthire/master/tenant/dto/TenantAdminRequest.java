package com.smarthire.master.tenant.dto;

import jakarta.validation.constraints.*;

public class TenantAdminRequest {
    @NotBlank @Email @Size(max = 255)
    private String adminEmail;
    @NotBlank @Size(max = 255)
    private String adminName;

    public String getAdminEmail() { return adminEmail; }
    public void setAdminEmail(String value) { adminEmail = value; }
    public String getAdminName() { return adminName; }
    public void setAdminName(String value) { adminName = value; }
}
