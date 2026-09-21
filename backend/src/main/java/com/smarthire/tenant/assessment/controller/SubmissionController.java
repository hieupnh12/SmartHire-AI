package com.smarthire.tenant.assessment.controller;

import com.smarthire.common.api.ApiResponse;
import com.smarthire.tenant.assessment.dto.request.SaveAnswersRequest;
import com.smarthire.tenant.assessment.dto.request.StartSubmissionRequest;
import com.smarthire.tenant.assessment.dto.response.SubmissionResponse;
import com.smarthire.tenant.assessment.service.SubmissionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
@Tag(name = "Technical Assessment - Submissions")
public class SubmissionController {
    private final SubmissionService service;

    public SubmissionController(SubmissionService service) { this.service = service; }

    @GetMapping("/applications/{applicationId}/assessments")
    @Operation(summary = "List published tests for own eligible application (candidate only)")
    public ApiResponse<java.util.List<com.smarthire.tenant.assessment.dto.response.AvailableAssessmentResponse>> available(@PathVariable long applicationId) {
        return ApiResponse.ok(service.available(applicationId));
    }

    @PostMapping("/assessments/{testId}/submissions")
    @Operation(summary = "Start or resume own MCQ submission (candidate only)", description = "applicationId must belong to the caller and test job. New starts require ASSESSMENT or INTERVIEW stage. Repeated calls return the existing submission, including completed submissions; no automatic retake.")
    public ApiResponse<SubmissionResponse> start(@PathVariable long testId, @Valid @RequestBody StartSubmissionRequest body) {
        return ApiResponse.ok(service.start(testId, body));
    }

    @GetMapping("/submissions/{id}")
    @Operation(summary = "Get own paper, saved answers and server deadline (candidate only)", description = "Never exposes correct options. Expired active submissions are finalized on access.")
    public ApiResponse<SubmissionResponse> get(@PathVariable long id) {
        return ApiResponse.ok(service.get(id));
    }

    @PostMapping("/submissions/{id}/answers")
    @Operation(summary = "Save own answers (candidate only)", description = "Partial upsert by questionId. Null option clears an answer. Late payloads are rejected with 409 SUBMISSION_EXPIRED; previously saved answers are graded. Wrong ownership returns 404.")
    public ApiResponse<SubmissionResponse> save(@PathVariable long id, @Valid @RequestBody SaveAnswersRequest body) {
        return ApiResponse.ok(service.save(id, body));
    }

    @PostMapping("/submissions/{id}/submit")
    @Operation(summary = "Submit and grade saved MCQ answers (candidate only)", description = "No request body. Save answers first. Repeated submit returns the same final score; unanswered questions score zero. Does not advance the application stage.")
    public ApiResponse<SubmissionResponse> submit(@PathVariable long id) {
        return ApiResponse.ok(service.submit(id));
    }

    @GetMapping("/submissions/{id}/result")
    @Operation(summary = "Inspect candidate submission and score (tenant staff only)")
    public ApiResponse<SubmissionResponse> result(@PathVariable long id) {
        return ApiResponse.ok(service.staffResult(id));
    }
}
