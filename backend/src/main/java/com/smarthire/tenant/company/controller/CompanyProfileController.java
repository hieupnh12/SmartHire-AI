package com.smarthire.tenant.company.controller;

import com.smarthire.common.api.ApiResponse;
import com.smarthire.tenant.company.dto.CompanyProfileResponse;
import com.smarthire.tenant.company.dto.UpdateCompanyProfileRequest;
import com.smarthire.tenant.company.dto.CompanyDirectoryModels.CompanyDirectoryResponse;
import com.smarthire.tenant.company.dto.CompanyDirectoryModels.UpdateCompanyDirectoryRequest;
import com.smarthire.tenant.company.service.CompanyDirectoryService;
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
    private final CompanyDirectoryService companyDirectoryService;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.smarthire.tenant.company.service.TenantSubscriptionQuotaService subscriptionQuotaService;

    @GetMapping("/subscription")
    @Operation(summary = "Get current tenant subscription plan, quotas, usage, and invoices",
            description = "Returns active subscription plan snapshot, all 6 quantitative limits, real-time usage, capability flags, and invoices for the current tenant.")
    public ResponseEntity<ApiResponse<com.smarthire.tenant.company.dto.TenantSubscriptionQuotaResponse>> getSubscription() {
        return ResponseEntity.ok(ApiResponse.ok(subscriptionQuotaService.getCurrentSubscriptionAndQuotas()));
    }

    @GetMapping("/subscription/change-preview")
    @Operation(summary = "Preview subscription Upgrade (Proration) or Downgrade (End of Cycle)",
            description = "Calculates unused day proration credit for mid-cycle Upgrade or schedules end-of-cycle Downgrade with quota validation.")
    public ResponseEntity<ApiResponse<com.smarthire.tenant.company.dto.SubscriptionChangePreviewResponse>> previewSubscriptionChange(
            @org.springframework.web.bind.annotation.RequestParam String targetPlanCode) {
        return ResponseEntity.ok(ApiResponse.ok(subscriptionQuotaService.previewPlanChange(targetPlanCode)));
    }

    @org.springframework.web.bind.annotation.PostMapping("/subscription/change-plan")
    @Operation(summary = "Execute subscription Upgrade or schedule end-of-cycle Downgrade",
            description = "Upgrades immediately with prorated credit and invoice, or schedules downgrade for the end of the current billing cycle.")
    public ResponseEntity<ApiResponse<com.smarthire.tenant.company.dto.TenantSubscriptionQuotaResponse>> changeSubscriptionPlan(
            @Valid @RequestBody com.smarthire.tenant.company.dto.SubscriptionChangeRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Đã cập nhật thay đổi gói dịch vụ thành công",
                subscriptionQuotaService.executePlanChange(request)
        ));
    }

    @org.springframework.web.bind.annotation.DeleteMapping("/subscription/scheduled-downgrade")
    @Operation(summary = "Cancel scheduled end-of-cycle downgrade",
            description = "Clears next_plan_id on the active tenant subscription so the current plan renews normally.")
    public ResponseEntity<ApiResponse<com.smarthire.tenant.company.dto.TenantSubscriptionQuotaResponse>> cancelScheduledDowngrade() {
        return ResponseEntity.ok(ApiResponse.ok(
                "Đã hủy lịch hạ cấp gói cuối kỳ",
                subscriptionQuotaService.cancelScheduledDowngrade()
        ));
    }

    @GetMapping("/directory")
    @Operation(summary = "Get company directory", description = "Lists departments and work locations configured for the current tenant.")
    public ResponseEntity<ApiResponse<CompanyDirectoryResponse>> getDirectory() {
        return ResponseEntity.ok(ApiResponse.ok(companyDirectoryService.get()));
    }

    @PutMapping("/directory")
    @Operation(summary = "Update company directory", description = "Replaces the department and work location catalogs for the current tenant.")
    public ResponseEntity<ApiResponse<CompanyDirectoryResponse>> updateDirectory(
            @Valid @RequestBody UpdateCompanyDirectoryRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Company directory updated successfully", companyDirectoryService.replace(request)));
    }

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
