package com.smarthire.tenant.mobile.dto;

import java.time.Instant;
import java.util.Map;

public record MobileConfigResponse(
        String minSupportedVersion,
        String latestVersion,
        boolean forceUpdate,
        String updateUrl,
        boolean maintenanceMode,
        Map<String, Boolean> features,
        Instant serverTime
) {}
