package com.smarthire.tenant.aiInterview.controller;

import com.smarthire.common.api.ApiResponse;
import com.smarthire.tenant.aiInterview.dto.request.AiInterviewConfigRequest;
import com.smarthire.tenant.aiInterview.service.AiInterviewConfigService;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/jobs/{jobId}/ai-interview-config")
public class AiInterviewConfigController {
    private final AiInterviewConfigService service;
    public AiInterviewConfigController(AiInterviewConfigService service) { this.service = service; }
    @GetMapping
    @Operation(summary = "Get the job AI interview configuration (staff)")
    public ApiResponse<AiInterviewConfigRequest> get(@PathVariable long jobId) { return ApiResponse.ok(service.get(jobId)); }
    @PutMapping
    @Operation(summary = "Configure AI interview availability and passing score (staff)")
    public ApiResponse<AiInterviewConfigRequest> update(@PathVariable long jobId, @Valid @RequestBody AiInterviewConfigRequest request) {
        return ApiResponse.ok(service.update(jobId, request));
    }
}
