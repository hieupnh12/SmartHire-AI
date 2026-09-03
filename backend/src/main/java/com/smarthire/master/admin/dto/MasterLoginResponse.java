package com.smarthire.master.admin.dto;

public class MasterLoginResponse {
    private String accessToken;
    private String tokenType = "Bearer";
    private PlatformUserResponse user;
    private String tenantId = "smarthire_master";

    public MasterLoginResponse() {}

    public MasterLoginResponse(String accessToken, String tokenType, PlatformUserResponse user, String tenantId) {
        this.accessToken = accessToken;
        this.tokenType = tokenType != null ? tokenType : "Bearer";
        this.user = user;
        this.tenantId = tenantId != null ? tenantId : "smarthire_master";
    }

    public String getAccessToken() { return accessToken; }
    public void setAccessToken(String accessToken) { this.accessToken = accessToken; }
    public String getTokenType() { return tokenType; }
    public void setTokenType(String tokenType) { this.tokenType = tokenType; }
    public PlatformUserResponse getUser() { return user; }
    public void setUser(PlatformUserResponse user) { this.user = user; }
    public String getTenantId() { return tenantId; }
    public void setTenantId(String tenantId) { this.tenantId = tenantId; }
}
