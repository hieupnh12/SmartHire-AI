package com.smarthire.tenant.assessment.controller;

import com.smarthire.common.api.ApiResponse;
import com.smarthire.tenant.assessment.service.AssessmentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import jakarta.validation.Valid;
import com.smarthire.tenant.assessment.dto.request.JobTestRequest;
import com.smarthire.tenant.assessment.dto.response.JobTestResponse;
import com.smarthire.tenant.assessment.dto.response.JobTestPage;

@RestController
@RequestMapping("/api/v1/assessments")
@Tag(name = "Technical Assessment")
public class AssessmentController {

    private final AssessmentService assessmentService;

    public AssessmentController(AssessmentService assessmentService) {
        this.assessmentService = assessmentService;
    }

    @PostMapping("/create_draft_test")
    @Operation(summary = "Create a draft JobTest (staff only)",
            description = "Requires a staff JWT and its matching tenant. Does not create questions or candidate submissions.")
    public ResponseEntity<ApiResponse<JobTestResponse>> create(@Valid @RequestBody JobTestRequest request) {
        return ResponseEntity.status(201).body(ApiResponse.ok(assessmentService.create(request)));
    }

    @GetMapping("/list_tenant_tests")
    @Operation(summary = "List JobTests in tenant (staff only)",
            description = "Newest first. Zero-based page; size limited to 1-50.")
    public ApiResponse<JobTestPage> list(@RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.ok(assessmentService.list(page, size));
    }

    @GetMapping("/get_test_metadata/{id}")
    @Operation(summary = "Get JobTest metadata by id (staff only)")
    public ApiResponse<JobTestResponse> get(@PathVariable long id) {
        return ApiResponse.ok(assessmentService.get(id));
    }

    @PutMapping("/update_draft_test/{id}")
    @Operation(summary = "Update draft JobTest metadata (staff only)",
            description = "The jobId must remain unchanged. Published or archived tests return 409.")
    public ApiResponse<JobTestResponse> update(@PathVariable long id, @Valid @RequestBody JobTestRequest request) {
        return ApiResponse.ok(assessmentService.update(id, request));
    }

    @GetMapping("/health")
    @Operation(summary = "Assessment module health check")
    public ResponseEntity<ApiResponse<Map<String, String>>> health() {
        return ResponseEntity.ok(ApiResponse.ok(assessmentService.health()));
    }
}
