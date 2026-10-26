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
    @org.springframework.beans.factory.annotation.Autowired
    private com.smarthire.tenant.assessment.service.AssessmentGradingService grading;
    @org.springframework.beans.factory.annotation.Autowired
    private com.smarthire.tenant.assessment.service.SubmissionGradingDetailService gradingDetail;

    public SubmissionController(SubmissionService service) { this.service = service; }

    @GetMapping("/applications/{applicationId}/list_available_assessments")
    @Operation(summary = "List published JobTests for own eligible application (candidate only)")
    public ApiResponse<java.util.List<com.smarthire.tenant.assessment.dto.response.AvailableAssessmentResponse>> available(@PathVariable long applicationId) {
        return ApiResponse.ok(service.available(applicationId));
    }

    @PostMapping("/assessments/{testId}/start_submission")
    @Operation(summary = "Start or resume own assessment submission (candidate only)",
            description = "applicationId must belong to the caller and test job. New starts require ASSESSMENT or INTERVIEW stage. Repeated calls return the existing submission, except demo papers ([Demo UI]) which start a new attempt after completion.")
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

    @PostMapping("/submissions/{id}/coding/{questionId}/run_samples")
    @Operation(summary = "Run up to five public sample cases in isolated sandbox (candidate owner only)")
    public ApiResponse<java.util.List<com.fasterxml.jackson.databind.JsonNode>> samples(@PathVariable long id, @PathVariable long questionId,
            @Valid @RequestBody SubmissionService.SampleRun body) { return ApiResponse.ok(service.runSamples(id, questionId, body)); }

    @PostMapping("/submissions/{id}/coding/{questionId}/run_custom")
    @Operation(summary = "Run candidate source against custom stdin (no expected-output grading; owner only)")
    public ApiResponse<com.fasterxml.jackson.databind.JsonNode> custom(@PathVariable long id, @PathVariable long questionId,
            @Valid @RequestBody SubmissionService.CustomRun body) { return ApiResponse.ok(service.runCustom(id, questionId, body)); }

    @org.springframework.beans.factory.annotation.Autowired
    private com.smarthire.tenant.assessment.service.AssessmentProctorService proctor;

    @PostMapping("/submissions/{id}/proctor-events")
    @Operation(summary = "Record assessment proctoring event (candidate owner only)")
    public ApiResponse<Void> proctorEvent(@PathVariable long id,
            @Valid @RequestBody com.smarthire.tenant.assessment.dto.request.AssessmentProctorEventRequest body) {
        proctor.record(id, body); return ApiResponse.ok(null);
    }

    @PostMapping("/submissions/{id}/complete_objective")
    @Operation(summary = "Lock saved objective answers and start practical section")
    public ApiResponse<SubmissionResponse> completeObjective(@PathVariable long id) { return ApiResponse.ok(service.completeObjective(id)); }

    @GetMapping("/submissions/{id}/grading_review")
    @Operation(summary = "Inspect AI suggestions and subjective answers (staff only)")
    public ApiResponse<java.util.List<com.smarthire.tenant.assessment.service.AssessmentGradingService.Review>> review(@PathVariable long id) {
        return ApiResponse.ok(grading.reviews(id));
    }
    public record GradeRequest(@jakarta.validation.constraints.DecimalMin("0") java.math.BigDecimal score) {}
    @GetMapping("/submissions/{id}/grading_detail")
    @Operation(summary = "Inspect objective totals and all subjective grading evidence (assigned staff only)")
    public ApiResponse<com.smarthire.tenant.assessment.dto.response.SubmissionGradingDetailResponse> detail(@PathVariable long id) {
        return ApiResponse.ok(gradingDetail.detail(id));
    }
    @PostMapping("/submissions/{id}/update_grading_result")
    @Operation(summary = "Atomically approve subjective decisions and refresh official result (assigned staff only)")
    public ApiResponse<com.smarthire.tenant.assessment.dto.response.SubmissionGradingDetailResponse> updateResult(@PathVariable long id,
            @Valid @RequestBody com.smarthire.tenant.assessment.dto.request.UpdateGradingRequest request) {
        return ApiResponse.ok(gradingDetail.update(id, request));
    }
    @PostMapping("/submissions/{id}/send_result_email")
    @Operation(summary = "Queue an approved result email; repeated identical requests reuse the outbox item (assigned staff only)")
    public ApiResponse<com.smarthire.tenant.assessment.service.SubmissionGradingDetailService.EmailReceipt> sendResultEmail(@PathVariable long id) {
        return ApiResponse.ok(gradingDetail.sendResult(id));
    }
    @PostMapping("/submissions/{id}/approve_grade/{questionId}")
    @Operation(summary = "Approve suggested score or provide reviewed score (staff only)")
    public ApiResponse<Void> approve(@PathVariable long id, @PathVariable long questionId, @Valid @RequestBody GradeRequest body) {
        grading.approve(id, questionId, body.score()); return ApiResponse.ok(null);
    }
    @PostMapping("/submissions/{id}/retry_grading")
    @Operation(summary = "Retry outstanding AI or sandbox grading (staff only)")
    public ApiResponse<Void> retry(@PathVariable long id) { grading.retry(id); return ApiResponse.ok(null); }

    @GetMapping("/jobs/{jobId}/list_assessment_submissions")
    @Operation(summary = "List candidate submissions for all tests of a job (staff only)",
            description = "Newest first. Requires job assignment (company admin sees all). Read-only: an IN_PROGRESS paper past its "
                    + "deadline is reported as EXPIRED with null score/submittedAt and is finalized on the next candidate/staff access.")
    public ApiResponse<java.util.List<SubmissionSummaryResponse>> listForJob(@PathVariable long jobId) {
        return ApiResponse.ok(service.staffList(jobId));
    }

    @org.springframework.beans.factory.annotation.Autowired
    private com.smarthire.tenant.assessment.service.AssessmentJobReportService jobReport;

    @GetMapping("/jobs/{jobId}/assessment_report")
    @Operation(summary = "Pass-rate, duration, custom-run and proctor summary for a job (staff only)")
    public ApiResponse<com.smarthire.tenant.assessment.dto.response.AssessmentJobReportResponse> assessmentReport(@PathVariable long jobId) {
        return ApiResponse.ok(jobReport.report(jobId));
    }

    @GetMapping("/submissions/{id}/get_result")
    @Operation(summary = "Inspect candidate submission and score (staff only)")
    public ApiResponse<SubmissionResponse> result(@PathVariable long id) {
        return ApiResponse.ok(service.staffResult(id));
    }
}
