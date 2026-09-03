package com.smarthire.master.tenant.controller;

import com.smarthire.common.api.ApiResponse;
import com.smarthire.domain.master.entity.TenantInfo;
import com.smarthire.master.tenant.dto.OnboardTenantRequest;
import com.smarthire.master.tenant.service.MasterTenantService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/master/tenants")
@Tag(name = "Master Tenant Management", description = "SaaS Platform APIs for Onboarding & Managing Enterprise Tenants")
public class MasterTenantController {

    private final MasterTenantService masterTenantService;

    public MasterTenantController(MasterTenantService masterTenantService) {
        this.masterTenantService = masterTenantService;
    }

    @GetMapping
    @Operation(summary = "List all Enterprise Tenants", description = "Returns directory of registered tenants.")
    public ResponseEntity<ApiResponse<List<TenantInfo>>> getAllTenants() {
        List<TenantInfo> tenants = masterTenantService.getAllTenants();
        return ResponseEntity.ok(ApiResponse.ok("Tenants directory fetched successfully", tenants));
    }

    @GetMapping("/check/{codeOrSubdomain}")
    @Operation(summary = "Check if Tenant Exists", description = "Verifies whether a tenant code or subdomain exists in Master DB.")
    public ResponseEntity<ApiResponse<Boolean>> checkTenantExists(@PathVariable String codeOrSubdomain) {
        boolean exists = masterTenantService.checkTenantExists(codeOrSubdomain);
        return ResponseEntity.ok(ApiResponse.ok("Tenant existence check completed", exists));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get Tenant Details", description = "Returns detailed metadata for a single tenant by ID.")
    public ResponseEntity<ApiResponse<TenantInfo>> getTenantById(@PathVariable Long id) {
        TenantInfo tenant = masterTenantService.getTenantById(id);
        return ResponseEntity.ok(ApiResponse.ok("Tenant details fetched successfully", tenant));
    }

    @PatchMapping("/{id}/status")
    @Operation(summary = "Activate or Suspend Tenant", description = "Updates tenant status to ACTIVE or SUSPENDED.")
    public ResponseEntity<ApiResponse<TenantInfo>> updateTenantStatus(
            @PathVariable Long id,
            @RequestParam String status) {
        TenantInfo tenant = masterTenantService.updateTenantStatus(id, status);
        return ResponseEntity.ok(ApiResponse.ok("Tenant status updated successfully", tenant));
    }

    @PostMapping("/onboard")
    @Operation(summary = "Onboard a new Enterprise Tenant", description = "Registers tenant metadata in Master DB and automatically provisions dedicated Tenant DB & runs Flyway migrations.")
    public ResponseEntity<ApiResponse<TenantInfo>> onboardTenant(@Valid @RequestBody OnboardTenantRequest request) {
        TenantInfo tenant = masterTenantService.onboardTenant(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Enterprise Tenant onboarded and database provisioned successfully", tenant));
    }
}
