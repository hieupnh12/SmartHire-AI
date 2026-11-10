package com.smarthire.tenant.company.controller;

import com.smarthire.common.api.ApiResponse;
import com.smarthire.master.billing.dto.CheckoutResponse;
import com.smarthire.tenant.company.dto.CompanyProfileResponse;
import com.smarthire.tenant.company.dto.RenewSubscriptionRequest;
import com.smarthire.tenant.company.dto.SubscriptionChangePreviewResponse;
import com.smarthire.tenant.company.dto.SubscriptionChangeRequest;
import com.smarthire.tenant.company.dto.TenantSubscriptionQuotaResponse;
import com.smarthire.tenant.company.dto.UpdateAutoRenewRequest;
import com.smarthire.tenant.company.dto.UpdateCompanyProfileRequest;
import com.smarthire.tenant.company.dto.CompanyDirectoryModels.CompanyDirectoryResponse;
import com.smarthire.tenant.company.dto.CompanyDirectoryModels.UpdateCompanyDirectoryRequest;
import com.smarthire.tenant.company.service.CompanyDirectoryService;
import com.smarthire.tenant.company.service.CompanyProfileService;
import com.smarthire.tenant.company.service.TenantSubscriptionQuotaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/tenant/company")
@RequiredArgsConstructor
@Tag(name = "Tenant Company Profile", description = "Company branding profile & subscription billing APIs for the current Enterprise Tenant")
public class CompanyProfileController {

    private final CompanyProfileService companyProfileService;
    private final CompanyDirectoryService companyDirectoryService;

    @Autowired(required = false)
    private TenantSubscriptionQuotaService subscriptionQuotaService;

    @GetMapping("/subscription")
    @Operation(summary = "Get current tenant subscription plan, quotas, usage, and invoices",
            description = "Returns active subscription plan snapshot, all 6 quantitative limits, real-time usage, capability flags, and invoices for the current tenant.")
    public ResponseEntity<ApiResponse<TenantSubscriptionQuotaResponse>> getSubscription() {
        return ResponseEntity.ok(ApiResponse.ok(subscriptionQuotaService.getCurrentSubscriptionAndQuotas()));
    }

    @GetMapping("/subscription/change-preview")
    @Operation(summary = "Preview subscription Upgrade (Proration) or Downgrade (End of Cycle)",
            description = "Calculates unused day proration credit for mid-cycle Upgrade or schedules end-of-cycle Downgrade with quota validation.")
    public ResponseEntity<ApiResponse<SubscriptionChangePreviewResponse>> previewSubscriptionChange(
            @RequestParam String targetPlanCode) {
        return ResponseEntity.ok(ApiResponse.ok(subscriptionQuotaService.previewPlanChange(targetPlanCode)));
    }

    @PostMapping("/subscription/change-plan")
    @Operation(summary = "Execute subscription Upgrade or schedule end-of-cycle Downgrade",
            description = "Creates a pending proration invoice on Upgrade (activated upon payment) or schedules Downgrade for the end of the current billing cycle.")
    public ResponseEntity<ApiResponse<TenantSubscriptionQuotaResponse>> changeSubscriptionPlan(
            @Valid @RequestBody SubscriptionChangeRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Đã ghi nhận yêu cầu thay đổi gói dịch vụ",
                subscriptionQuotaService.executePlanChange(request)
        ));
    }

    @PostMapping("/subscription/renew")
    @Operation(summary = "Create renewal invoice for current subscription plan",
            description = "Generates a pending renewal invoice (1-5 years) for the tenant's active or expired subscription, or activates Starter when on fallback mode.")
    public ResponseEntity<ApiResponse<TenantSubscriptionQuotaResponse>> renewSubscription(
            @Valid @RequestBody(required = false) RenewSubscriptionRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Đã tạo hóa đơn gia hạn gói dịch vụ",
                subscriptionQuotaService.renewSubscription(request != null ? request : new RenewSubscriptionRequest())
        ));
    }

    @PatchMapping("/subscription/auto-renew")
    @Operation(summary = "Update auto-renew preference on tenant subscription",
            description = "Enables or disables automatic renewal at end of billing cycle.")
    public ResponseEntity<ApiResponse<TenantSubscriptionQuotaResponse>> updateAutoRenew(
            @Valid @RequestBody UpdateAutoRenewRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Đã cập nhật cài đặt tự động gia hạn",
                subscriptionQuotaService.updateAutoRenew(Boolean.TRUE.equals(request.getAutoRenew()))
        ));
    }

    @GetMapping("/subscription/invoices/{invoiceId}/checkout")
    @Operation(summary = "Get checkout payment details (VietQR/Bank info) for a tenant invoice",
            description = "Verifies tenant ownership of the invoice and returns payment gateway metadata and VietQR URL.")
    public ResponseEntity<ApiResponse<CheckoutResponse>> getInvoiceCheckout(
            @PathVariable Long invoiceId) {
        return ResponseEntity.ok(ApiResponse.ok(subscriptionQuotaService.getInvoiceCheckoutDetails(invoiceId)));
    }

    @PostMapping("/subscription/invoices/{invoiceId}/cancel")
    @Operation(summary = "Cancel a pending upgrade or renewal invoice",
            description = "Cancels a PENDING invoice owned by the current tenant and cleans up its linked pending subscription if any.")
    public ResponseEntity<ApiResponse<TenantSubscriptionQuotaResponse>> cancelPendingInvoice(
            @PathVariable Long invoiceId) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Đã hủy hóa đơn chờ thanh toán",
                subscriptionQuotaService.cancelPendingInvoice(invoiceId)
        ));
    }

    @DeleteMapping("/subscription/scheduled-downgrade")
    @Operation(summary = "Cancel scheduled end-of-cycle downgrade",
            description = "Clears next_plan_id on the active tenant subscription so the current plan renews normally.")
    public ResponseEntity<ApiResponse<TenantSubscriptionQuotaResponse>> cancelScheduledDowngrade() {
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
