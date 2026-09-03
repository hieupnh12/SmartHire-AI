package com.smarthire.tenant.auth.dto;

public class LoginResponse {
    private String accessToken;
    private String tokenType = "Bearer";
    private UserResponse user;
    private String tenantId;

    public LoginResponse() {}

    public LoginResponse(String accessToken, String tokenType, UserResponse user, String tenantId) {
        this.accessToken = accessToken;
        this.tokenType = tokenType != null ? tokenType : "Bearer";
        this.user = user;
        this.tenantId = tenantId;
    }

    public String getAccessToken() { return accessToken; }
    public void setAccessToken(String accessToken) { this.accessToken = accessToken; }
    public String getTokenType() { return tokenType; }
    public void setTokenType(String tokenType) { this.tokenType = tokenType; }
    public UserResponse getUser() { return user; }
    public void setUser(UserResponse user) { this.user = user; }
    public String getTenantId() { return tenantId; }
    public void setTenantId(String tenantId) { this.tenantId = tenantId; }
}
