package com.smarthire.tenant.auth.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class TenantLogoutRequest {

    @Schema(description = "Refresh token to revoke (optional if only revoking current JWT)", example = "550e8400-e29b-41d4-a716-446655440000")
    private String refreshToken;
}
