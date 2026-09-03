package com.smarthire.master.subscription.controller;

import com.smarthire.common.api.ApiResponse;
import com.smarthire.domain.master.entity.SubscriptionPlan;
import com.smarthire.domain.master.repository.SubscriptionPlanRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/master/subscriptions")
@Tag(name = "Master Subscription Management", description = "APIs for managing SaaS Subscription Plans")
public class MasterSubscriptionController {

    private final SubscriptionPlanRepository planRepository;

    public MasterSubscriptionController(SubscriptionPlanRepository planRepository) {
        this.planRepository = planRepository;
    }

    @GetMapping
    @Operation(summary = "List all Subscription Plans", description = "Returns active & inactive subscription plans.")
    public ResponseEntity<ApiResponse<List<SubscriptionPlan>>> getAllPlans() {
        return ResponseEntity.ok(ApiResponse.ok("Plans fetched successfully", planRepository.findAll()));
    }

    @PostMapping
    @Operation(summary = "Create New Subscription Plan", description = "Adds a new subscription plan to Master DB.")
    public ResponseEntity<ApiResponse<SubscriptionPlan>> createPlan(@RequestBody SubscriptionPlan plan) {
        if (planRepository.findByCode(plan.getCode()).isPresent()) {
            throw new IllegalArgumentException("Plan code '" + plan.getCode() + "' already exists.");
        }
        SubscriptionPlan saved = planRepository.save(plan);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Subscription plan created successfully", saved));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update Subscription Plan", description = "Modifies pricing or quotas for an existing plan.")
    public ResponseEntity<ApiResponse<SubscriptionPlan>> updatePlan(@PathVariable Long id, @RequestBody SubscriptionPlan planData) {
        SubscriptionPlan existing = planRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Subscription plan not found: " + id));

        existing.setName(planData.getName());
        existing.setDescription(planData.getDescription());
        existing.setPriceMonthly(planData.getPriceMonthly());
        existing.setPriceYearly(planData.getPriceYearly());
        existing.setMaxJobs(planData.getMaxJobs());
        existing.setMaxCvParses(planData.getMaxCvParses());
        existing.setMaxAiInterviewHours(planData.getMaxAiInterviewHours());

        SubscriptionPlan updated = planRepository.save(existing);
        return ResponseEntity.ok(ApiResponse.ok("Subscription plan updated successfully", updated));
    }

    @PatchMapping("/{id}/status")
    @Operation(summary = "Activate or Deactivate Subscription Plan", description = "Toggles plan status (ACTIVE/INACTIVE).")
    public ResponseEntity<ApiResponse<SubscriptionPlan>> updatePlanStatus(@PathVariable Long id, @RequestParam String status) {
        SubscriptionPlan existing = planRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Subscription plan not found: " + id));

        existing.setStatus(status.toUpperCase());
        SubscriptionPlan updated = planRepository.save(existing);
        return ResponseEntity.ok(ApiResponse.ok("Subscription plan status updated successfully", updated));
    }
}
