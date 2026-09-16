package com.smarthire.master.admin.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MasterLoginResponse {
    private String accessToken;
    @Builder.Default
    private String tokenType = "Bearer";
    private PlatformUserResponse user;
    @Builder.Default
    private String tenantId = "smarthire_master";
}

