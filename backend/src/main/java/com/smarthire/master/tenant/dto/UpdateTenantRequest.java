package com.smarthire.master.tenant.dto;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UpdateTenantRequest {
    String companyName;
    String industry;
    String companySize;
    String contactName;
    String contactEmail;
    String contactPhone;
    String subdomain;
    String website;
    String address;
    String taxCode;
}
