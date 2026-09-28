package com.smarthire.tenant.job.controller;

import com.smarthire.common.api.ApiResponse;
import com.smarthire.tenant.job.dto.JobAssignmentModels.AssignRecruiterRequest;
import com.smarthire.tenant.job.dto.JobAssignmentModels.JobAssignmentResponse;
import com.smarthire.tenant.job.dto.JobAssignmentModels.UpdateAssignmentRequest;
import com.smarthire.tenant.job.service.JobAssignmentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/jobs/{jobId}/assignments")
@Tag(name = "Job Assignments", description = "Company admin assigns recruiter staff to a job")
public class JobAssignmentController {
    private final JobAssignmentService jobAssignmentService;

    public JobAssignmentController(JobAssignmentService jobAssignmentService) {
        this.jobAssignmentService = jobAssignmentService;
    }

    @GetMapping
    @Operation(summary = "List recruiters assigned to a job")
    public ApiResponse<List<JobAssignmentResponse>> list(@PathVariable long jobId) {
        return ApiResponse.ok(jobAssignmentService.list(jobId));
    }

    @PostMapping
    @Operation(summary = "Assign a recruiter to a job")
    public ResponseEntity<ApiResponse<JobAssignmentResponse>> assign(
            @PathVariable long jobId,
            @Valid @RequestBody AssignRecruiterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Recruiter assigned", jobAssignmentService.assign(jobId, request)));
    }

    @PatchMapping("/{userId}")
    @Operation(summary = "Change assignment role on a job")
    public ApiResponse<JobAssignmentResponse> updateRole(
            @PathVariable long jobId,
            @PathVariable long userId,
            @Valid @RequestBody UpdateAssignmentRequest request) {
        return ApiResponse.ok("Assignment updated", jobAssignmentService.updateRole(jobId, userId, request));
    }

    @DeleteMapping("/{userId}")
    @Operation(summary = "Remove a recruiter from a job")
    public ApiResponse<Void> remove(@PathVariable long jobId, @PathVariable long userId) {
        jobAssignmentService.remove(jobId, userId);
        return ApiResponse.ok("Assignment removed", null);
    }
}
