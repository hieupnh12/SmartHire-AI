package com.smarthire.master.subscription.controller;

import com.smarthire.common.api.ApiResponse;
import com.smarthire.master.subscription.dto.*;
import com.smarthire.master.subscription.service.MasterSubscriptionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/master/subscriptions")
@RequiredArgsConstructor
@Tag(name = "Master Subscription Management", description = "APIs for managing Tier 1 SaaS Plan Catalog & Tier 2 Tenant Subscription Instances")
public class MasterSubscriptionController {

    private final MasterSubscriptionService subscriptionService;

    @GetMapping
    @Operation(summary = "List all Subscription Plans", description = "Returns active, archived, and custom subscription plans.")
    public ResponseEntity<ApiResponse<List<SubscriptionPlanResponse>>> getAllPlans() {
        return ResponseEntity.ok(ApiResponse.ok("Plans fetched successfully", subscriptionService.getAllPlans()));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get Subscription Plan Details", description = "Returns details for a specific subscription plan by ID.")
    public ResponseEntity<ApiResponse<SubscriptionPlanResponse>> getPlanById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok("Plan details fetched successfully", subscriptionService.getPlanById(id)));
    }

    @PostMapping
    @Operation(summary = "Create New Subscription Plan", description = "Adds a new subscription plan to Master DB.")
    public ResponseEntity<ApiResponse<SubscriptionPlanResponse>> createPlan(@Valid @RequestBody CreateSubscriptionPlanRequest request) {
        SubscriptionPlanResponse response = subscriptionService.createPlan(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Subscription plan created successfully", response));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update Subscription Plan (with Grandfathering Versioning)", description = "If the plan has active subscribers, archives the old version and creates Plan V(n+1) to preserve existing contracts.")
    public ResponseEntity<ApiResponse<SubscriptionPlanResponse>> updatePlan(
            @PathVariable Long id, 
            @Valid @RequestBody UpdateSubscriptionPlanRequest request) {
        SubscriptionPlanResponse response = subscriptionService.updatePlan(id, request);
        return ResponseEntity.ok(ApiResponse.ok("Subscription plan updated successfully", response));
    }

    @PatchMapping("/{id}/status")
    @Operation(summary = "Update Plan Catalog Status", description = "Sets plan status (ACTIVE / INACTIVE / ARCHIVED).")
    public ResponseEntity<ApiResponse<SubscriptionPlanResponse>> updatePlanStatus(
            @PathVariable Long id, 
            @RequestParam String status) {
        SubscriptionPlanResponse response = subscriptionService.updatePlanStatus(id, status);
        return ResponseEntity.ok(ApiResponse.ok("Subscription plan status updated successfully", response));
    }

    @PostMapping("/{id}/clone-custom")
    @Operation(summary = "Clone Template into Custom Enterprise Plan for a Tenant", description = "Clones an existing plan with custom quotas/pricing for a single tenant without listing it publicly.")
    public ResponseEntity<ApiResponse<SubscriptionPlanResponse>> cloneCustomPlan(
            @PathVariable Long id,
            @Valid @RequestBody CloneCustomPlanRequest request) {
        SubscriptionPlanResponse response = subscriptionService.cloneCustomPlanForTenant(id, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Custom enterprise plan cloned successfully", response));
    }

    @GetMapping("/tenants/{tenantId}")
    @Operation(summary = "Get Tenant Subscription Instance & Snapshot", description = "Returns the active subscription instance and immutable resource snapshot for a tenant.")
    public ResponseEntity<ApiResponse<TenantSubscriptionInstanceResponse>> getTenantSubscriptionInstance(@PathVariable Long tenantId) {
        return ResponseEntity.ok(ApiResponse.ok("Tenant subscription instance fetched", subscriptionService.getTenantSubscriptionInstance(tenantId)));
    }

    @PutMapping("/tenants/{tenantId}")
    @Operation(summary = "Assign Plan or Customize Tenant Subscription Snapshot", description = "Assigns a plan or overrides custom quotas/pricing/lifecycle status on a tenant's subscription instance.")
    public ResponseEntity<ApiResponse<TenantSubscriptionInstanceResponse>> assignOrCustomizeTenantSubscription(
            @PathVariable Long tenantId,
            @Valid @RequestBody AssignTenantSubscriptionRequest request) {
        TenantSubscriptionInstanceResponse response = subscriptionService.assignOrCustomizeTenantSubscription(tenantId, request);
        return ResponseEntity.ok(ApiResponse.ok("Tenant subscription instance updated successfully", response));
    }
}
