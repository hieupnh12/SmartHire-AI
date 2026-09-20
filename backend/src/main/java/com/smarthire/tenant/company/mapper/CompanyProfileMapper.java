package com.smarthire.tenant.company.mapper;

import com.smarthire.domain.master.entity.TenantInfo;
import com.smarthire.tenant.company.dto.CompanyProfileResponse;
import com.smarthire.tenant.company.dto.UpdateCompanyProfileRequest;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.Named;

@Mapper
public interface CompanyProfileMapper {

    @Mapping(target = "tenantId", source = "code")
    @Mapping(target = "companyName", source = "name")
    CompanyProfileResponse toCompanyProfileResponse(TenantInfo tenant);

    // Database credentials and provisioning columns are never mapped from client input.
    @Mapping(target = "name", source = "companyName", qualifiedByName = "blankToNull")
    @Mapping(target = "description", qualifiedByName = "blankToNull")
    @Mapping(target = "logoUrl", qualifiedByName = "blankToNull")
    @Mapping(target = "website", qualifiedByName = "blankToNull")
    @Mapping(target = "address", qualifiedByName = "blankToNull")
    @Mapping(target = "industry", qualifiedByName = "blankToNull")
    @Mapping(target = "companySize", qualifiedByName = "blankToNull")
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "code", ignore = true)
    @Mapping(target = "subdomain", ignore = true)
    @Mapping(target = "dbName", ignore = true)
    @Mapping(target = "dbUrl", ignore = true)
    @Mapping(target = "dbUsername", ignore = true)
    @Mapping(target = "dbPassword", ignore = true)
    @Mapping(target = "managedDatabase", ignore = true)
    @Mapping(target = "verified", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    void updateEntity(UpdateCompanyProfileRequest request, @MappingTarget TenantInfo tenant);

    @Named("blankToNull")
    default String blankToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
