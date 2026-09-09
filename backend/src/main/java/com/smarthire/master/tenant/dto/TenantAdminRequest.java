package com.smarthire.master.tenant.dto;

import jakarta.validation.constraints.*;
import com.fasterxml.jackson.annotation.JsonProperty;

public class TenantAdminRequest {
    @NotBlank @Email @Size(max = 255)
    private String adminEmail;
    @NotBlank @Size(max = 255)
    private String adminName;
    @NotBlank @Size(min = 12, max = 72)
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private String adminPassword;

    @AssertTrue(message = "Admin password must be at most 72 UTF-8 bytes")
    @com.fasterxml.jackson.annotation.JsonIgnore
    public boolean isPasswordWithinByteLimit() {
        return adminPassword == null || adminPassword.getBytes(java.nio.charset.StandardCharsets.UTF_8).length <= 72;
    }

    public String getAdminEmail() { return adminEmail; }
    public void setAdminEmail(String value) { adminEmail = value; }
    public String getAdminName() { return adminName; }
    public void setAdminName(String value) { adminName = value; }
    public String getAdminPassword() { return adminPassword; }
    public void setAdminPassword(String value) { adminPassword = value; }
}
