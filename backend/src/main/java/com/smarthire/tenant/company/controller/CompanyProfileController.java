package com.smarthire.tenant.company.controller;

import com.smarthire.common.api.ApiResponse;
import com.smarthire.tenant.company.dto.CompanyProfileResponse;
import com.smarthire.tenant.company.dto.UpdateCompanyProfileRequest;
import com.smarthire.tenant.company.service.CompanyProfileService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/tenant/company")
@RequiredArgsConstructor
@Tag(name = "Tenant Company Profile", description = "Company branding profile APIs for the current Enterprise Tenant")
public class CompanyProfileController {

    private final CompanyProfileService companyProfileService;

    @GetMapping("/profile")
    @Operation(summary = "Get Company Profile", description = "Returns the branding profile of the current tenant (name, logo, website, address, industry, size).")
    public ResponseEntity<ApiResponse<CompanyProfileResponse>> getProfile() {
        CompanyProfileResponse response = companyProfileService.getProfile();
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PutMapping("/profile")
    @Operation(summary = "Update Company Profile", description = "Updates the branding profile of the current tenant. Restricted to TENANT_ADMIN and ADMIN roles.")
    public ResponseEntity<ApiResponse<CompanyProfileResponse>> updateProfile(@Valid @RequestBody UpdateCompanyProfileRequest request) {
        CompanyProfileResponse response = companyProfileService.updateProfile(request);
        return ResponseEntity.ok(ApiResponse.ok("Company profile updated successfully", response));
    }
}
