package com.smarthire.master.subscription.controller;

import com.smarthire.common.api.ApiResponse;
import com.smarthire.master.subscription.dto.CreateSubscriptionPlanRequest;
import com.smarthire.master.subscription.dto.SubscriptionPlanResponse;
import com.smarthire.master.subscription.dto.UpdateSubscriptionPlanRequest;
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
@Tag(name = "Master Subscription Management", description = "APIs for managing SaaS Subscription Plans")
public class MasterSubscriptionController {

    private final MasterSubscriptionService subscriptionService;

    @GetMapping
    @Operation(summary = "List all Subscription Plans", description = "Returns active & inactive subscription plans.")
    public ResponseEntity<ApiResponse<List<SubscriptionPlanResponse>>> getAllPlans() {
        return ResponseEntity.ok(ApiResponse.ok("Plans fetched successfully", subscriptionService.getAllPlans()));
    }

    @PostMapping
    @Operation(summary = "Create New Subscription Plan", description = "Adds a new subscription plan to Master DB.")
    public ResponseEntity<ApiResponse<SubscriptionPlanResponse>> createPlan(@Valid @RequestBody CreateSubscriptionPlanRequest request) {
        SubscriptionPlanResponse response = subscriptionService.createPlan(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Subscription plan created successfully", response));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update Subscription Plan", description = "Modifies pricing or quotas for an existing plan.")
    public ResponseEntity<ApiResponse<SubscriptionPlanResponse>> updatePlan(
            @PathVariable Long id, 
            @Valid @RequestBody UpdateSubscriptionPlanRequest request) {
        SubscriptionPlanResponse response = subscriptionService.updatePlan(id, request);
        return ResponseEntity.ok(ApiResponse.ok("Subscription plan updated successfully", response));
    }

    @PatchMapping("/{id}/status")
    @Operation(summary = "Activate or Deactivate Subscription Plan", description = "Toggles plan status (ACTIVE/INACTIVE).")
    public ResponseEntity<ApiResponse<SubscriptionPlanResponse>> updatePlanStatus(
            @PathVariable Long id, 
            @RequestParam String status) {
        SubscriptionPlanResponse response = subscriptionService.updatePlanStatus(id, status);
        return ResponseEntity.ok(ApiResponse.ok("Subscription plan status updated successfully", response));
    }
}
