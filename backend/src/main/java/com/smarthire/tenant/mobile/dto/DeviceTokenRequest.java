package com.smarthire.tenant.mobile.dto;

import jakarta.validation.constraints.NotBlank;

public record DeviceTokenRequest(
        @NotBlank(message = "Token cannot be blank") String fcmToken,
        String platform,
        String deviceModel,
        String appVersion
) {}
