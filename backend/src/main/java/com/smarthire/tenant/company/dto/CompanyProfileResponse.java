package com.smarthire.tenant.company.dto;

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
public class CompanyProfileResponse {

    private String tenantId;
    private String companyName;
    private String subdomain;
    private String description;
    private String logoUrl;
    private String website;
    private String address;
    private String industry;
    private String companySize;
    private boolean verified;
}
