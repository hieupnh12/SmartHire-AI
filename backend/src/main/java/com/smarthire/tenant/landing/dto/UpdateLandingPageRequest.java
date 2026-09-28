package com.smarthire.tenant.landing.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateLandingPageRequest {

    @Valid
    @NotNull(message = "Landing page configuration is required")
    private LandingPageConfigDto config;

    @Builder.Default
    private Boolean publish = true;
}
