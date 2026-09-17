package com.smarthire.tenant.company.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
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
public class UpdateCompanyProfileRequest {

    private static final String URL_PATTERN = "^$|^https?://\\S+$";

    @NotBlank(message = "Company name is required")
    @Size(max = 255, message = "Company name must not exceed 255 characters")
    private String companyName;

    @Size(max = 5000, message = "Description must not exceed 5000 characters")
    private String description;

    @Size(max = 512, message = "Logo URL must not exceed 512 characters")
    @Pattern(regexp = URL_PATTERN, message = "Logo URL must start with http:// or https://")
    private String logoUrl;

    @Size(max = 255, message = "Website must not exceed 255 characters")
    @Pattern(regexp = URL_PATTERN, message = "Website must start with http:// or https://")
    private String website;

    @Size(max = 512, message = "Address must not exceed 512 characters")
    private String address;

    @Size(max = 128, message = "Industry must not exceed 128 characters")
    private String industry;

    @Size(max = 64, message = "Company size must not exceed 64 characters")
    private String companySize;
}
