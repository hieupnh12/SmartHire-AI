package com.smarthire.tenant.assessment.controller;

import com.smarthire.common.api.ApiResponse;
import com.smarthire.tenant.assessment.dto.request.AssessmentConfigRequest;
import com.smarthire.tenant.assessment.dto.response.JobTestResponse;
import com.smarthire.tenant.assessment.service.AssessmentGenerationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/assessments/jobs/{jobId}")
@Tag(name = "Assessment Generation")
public class AssessmentGenerationController {
    private final AssessmentGenerationService service;
    public AssessmentGenerationController(AssessmentGenerationService service) { this.service = service; }

    @GetMapping("/configuration")
    @Operation(summary = "Read job assessment structure (staff with job access)")
    public ApiResponse<AssessmentConfigRequest> config(@PathVariable long jobId) {
        return ApiResponse.ok(service.config(jobId));
    }

    @GetMapping("/automation_status")
    @Operation(summary = "Read eligible application counts and bank readiness for automatic assessments")
    public ApiResponse<AssessmentGenerationService.AutomationStatus> status(@PathVariable long jobId) {
        return ApiResponse.ok(service.status(jobId));
    }

    @PutMapping("/configuration")
    @Operation(summary = "Save structure and enable automatic assessments for eligible passed applications",
            description = "Existing and future applications are picked up asynchronously. Each application receives at most one generated test.")
    public ApiResponse<AssessmentConfigRequest> save(@PathVariable long jobId, @Valid @RequestBody AssessmentConfigRequest request) {
        return ApiResponse.ok(service.saveConfig(jobId, request));
    }

    @PostMapping("/generate")
    @Operation(summary = "Generate a named draft assessment from the saved job structure and question bank")
    public ApiResponse<JobTestResponse> generate(@PathVariable long jobId) { return ApiResponse.ok(service.generate(jobId)); }
}
