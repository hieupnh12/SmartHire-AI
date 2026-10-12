package com.smarthire.master.ai.dto;

import java.util.HashMap;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiRateLimitConfigDto {

    @Builder.Default
    private Boolean enabled = true;

    @Builder.Default
    private Integer defaultRpmPerTenant = 30;

    @Builder.Default
    private Long defaultTpmPerTenant = 100_000L;

    @Builder.Default
    private Map<String, Integer> tenantRpmOverrides = new HashMap<>();
}
