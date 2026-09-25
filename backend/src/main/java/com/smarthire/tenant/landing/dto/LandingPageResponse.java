package com.smarthire.tenant.landing.dto;

import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LandingPageResponse {

    private Long id;
    private LandingPageConfigDto config;
    private boolean published;
    private Instant publishedAt;
    private Instant createdAt;
    private Instant updatedAt;
}
