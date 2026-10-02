package com.smarthire.tenant.assessment.controller;

import com.smarthire.common.api.ApiResponse;
import com.smarthire.tenant.assessment.dto.request.SaveAnswersRequest;
import com.smarthire.tenant.assessment.dto.request.StartSubmissionRequest;
import com.smarthire.tenant.assessment.dto.response.SubmissionResponse;
import com.smarthire.tenant.assessment.dto.response.SubmissionSummaryResponse;
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

    @GetMapping("/applications/{applicationId}/list_available_assessments")
    @Operation(summary = "List published JobTests for own eligible application (candidate only)")
    public ApiResponse<java.util.List<com.smarthire.tenant.assessment.dto.response.AvailableAssessmentResponse>> available(@PathVariable long applicationId) {
        return ApiResponse.ok(service.available(applicationId));
    }

    @PostMapping("/assessments/{testId}/start_submission")
    @Operation(summary = "Start or resume own assessment submission (candidate only)",
            description = "applicationId must belong to the caller and test job. New starts require ASSESSMENT or INTERVIEW stage. Repeated calls return the existing submission, including completed submissions; no automatic retake.")
    public ApiResponse<SubmissionResponse> start(@PathVariable long testId, @Valid @RequestBody StartSubmissionRequest body) {
        return ApiResponse.ok(service.start(testId, body));
    }

    @GetMapping("/submissions/{id}/get_submission")
    @Operation(summary = "Get own paper, saved answers and server deadline (candidate only)",
            description = "Never exposes correct options. Expired active submissions are finalized on access.")
    public ApiResponse<SubmissionResponse> get(@PathVariable long id) {
        return ApiResponse.ok(service.get(id));
    }

    @PostMapping("/submissions/{id}/save_answers")
    @Operation(summary = "Save own answers (candidate only)",
            description = "Partial upsert by questionId: selectedOptionId for MCQ, selectedOptionIds for multiple choice, answerText for essay. Null/empty clears that answer. Late payloads return 409 SUBMISSION_EXPIRED. Wrong ownership returns 404.")
    public ApiResponse<SubmissionResponse> save(@PathVariable long id, @Valid @RequestBody SaveAnswersRequest body) {
        return ApiResponse.ok(service.save(id, body));
    }

    @PostMapping("/submissions/{id}/submit_test")
    @Operation(summary = "Submit saved answers (candidate only)",
            description = "Save first. Choice answers are graded; multiple choice requires the exact correct set. Papers with essays await review (SUBMITTED, score/passed null); expired papers remain EXPIRED with null score. Repeated submit is idempotent. Does not advance the application stage.")
    public ApiResponse<SubmissionResponse> submit(@PathVariable long id) {
        return ApiResponse.ok(service.submit(id));
    }

    @GetMapping("/jobs/{jobId}/list_assessment_submissions")
    @Operation(summary = "List candidate submissions for all tests of a job (staff only)",
            description = "Newest first. Requires job assignment (company admin sees all). Read-only: an IN_PROGRESS paper past its "
                    + "deadline is reported as EXPIRED with null score/submittedAt and is finalized on the next candidate/staff access.")
    public ApiResponse<java.util.List<SubmissionSummaryResponse>> listForJob(@PathVariable long jobId) {
        return ApiResponse.ok(service.staffList(jobId));
    }

    @GetMapping("/submissions/{id}/get_result")
    @Operation(summary = "Inspect candidate submission and score (staff only)")
    public ApiResponse<SubmissionResponse> result(@PathVariable long id) {
        return ApiResponse.ok(service.staffResult(id));
    }
}
