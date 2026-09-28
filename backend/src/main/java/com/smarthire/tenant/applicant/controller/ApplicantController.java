package com.smarthire.tenant.applicant.controller;

import com.smarthire.common.api.ApiResponse;
import com.smarthire.domain.enums.ApplicationStatus;
import com.smarthire.tenant.applicant.dto.ApplicantModels.ApplicationDetail;
import com.smarthire.tenant.applicant.dto.ApplicantModels.ApplicationSummary;
import com.smarthire.tenant.applicant.dto.ApplicantModels.HistoryView;
import com.smarthire.tenant.applicant.dto.ApplicantModels.ManualCreateRequest;
import com.smarthire.tenant.applicant.dto.ApplicantModels.PageResult;
import com.smarthire.tenant.applicant.dto.ApplicantModels.PatchRequest;
import com.smarthire.tenant.applicant.dto.ApplicantModels.StatusRequest;
import com.smarthire.tenant.applicant.service.ApplicantService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
@Tag(name = "Applicant Management")
public class ApplicantController {
    private final ApplicantService applicants;

    public ApplicantController(ApplicantService applicants) {
        this.applicants = applicants;
    }

    @GetMapping("/applications/health")
    @Operation(summary = "Applicant Management module health")
    public ResponseEntity<ApiResponse<Map<String, String>>> health() {
        return ResponseEntity.ok(ApiResponse.ok(applicants.health()));
    }

    @GetMapping("/applications/me")
    @Operation(summary = "List applications of the current candidate")
    public ApiResponse<List<ApplicationSummary>> mine() {
        return ApiResponse.ok(applicants.mine());
    }

    @GetMapping("/applications")
    @Operation(summary = "List applications visible to the current staff member")
    public ApiResponse<PageResult<ApplicationSummary>> listVisible(
            @RequestParam(required = false) Long jobId,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) ApplicationStatus status,
            @RequestParam(required = false) String source,
            @RequestParam(defaultValue = "false") boolean archived,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.ok(applicants.listVisible(jobId, q, status, source, archived, page, size));
    }

    @GetMapping("/jobs/{jobId}/applications")
    @Operation(summary = "Search applications for a job")
    public ApiResponse<PageResult<ApplicationSummary>> list(
            @PathVariable long jobId,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) ApplicationStatus status,
            @RequestParam(required = false) String source,
            @RequestParam(defaultValue = "false") boolean archived,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.ok(applicants.list(jobId, q, status, source, archived, page, size));
    }

    @PostMapping("/jobs/{jobId}/applications")
    @Operation(summary = "Candidate apply to a published job")
    public ApiResponse<ApplicationSummary> apply(
            @PathVariable long jobId,
            @RequestBody(required = false) Map<String, String> body) {
        String source = body == null ? null : body.get("source");
        String referral = body == null ? null : body.get("referralCode");
        Long cvId = parseLong(body == null ? null : body.get("cvId"));
        return ApiResponse.ok(applicants.apply(jobId, source, referral, cvId));
    }

    @PostMapping("/jobs/{jobId}/applications/manual")
    @Operation(summary = "Recruiter creates a candidate application")
    public ApiResponse<ApplicationSummary> createManual(
            @PathVariable long jobId,
            @Valid @RequestBody ManualCreateRequest body) {
        return ApiResponse.ok(applicants.createManual(jobId, body));
    }

    @GetMapping("/applications/{id}")
    @Operation(summary = "Application detail, CV versions and profile")
    public ApiResponse<ApplicationDetail> get(@PathVariable long id) {
        return ApiResponse.ok(applicants.get(id));
    }

    @PatchMapping("/applications/{id}")
    @Operation(summary = "Update notes, tags, assignee, source")
    public ApiResponse<ApplicationDetail> patch(@PathVariable long id, @RequestBody PatchRequest body) {
        return ApiResponse.ok(applicants.patch(id, body));
    }

    @PostMapping("/applications/{id}/status")
    @Operation(summary = "Change application status")
    public ApiResponse<ApplicationDetail> status(@PathVariable long id, @RequestBody StatusRequest body) {
        return ApiResponse.ok(applicants.changeStatus(id, body.status(), body.note()));
    }

    @PostMapping("/applications/{id}/reject")
    @Operation(summary = "Reject an application")
    public ApiResponse<ApplicationDetail> reject(@PathVariable long id, @RequestBody(required = false) StatusRequest body) {
        return ApiResponse.ok(applicants.reject(id, body == null ? null : body.note()));
    }

    @PostMapping("/applications/{id}/archive")
    @Operation(summary = "Archive an application")
    public ApiResponse<ApplicationDetail> archive(@PathVariable long id) {
        return ApiResponse.ok(applicants.archive(id));
    }

    @PostMapping("/applications/{id}/restore")
    @Operation(summary = "Restore an archived or rejected application")
    public ApiResponse<ApplicationDetail> restore(@PathVariable long id) {
        return ApiResponse.ok(applicants.restore(id));
    }

    @PostMapping("/applications/{id}/withdraw")
    @Operation(summary = "Candidate withdraws an application")
    public ApiResponse<ApplicationDetail> withdraw(@PathVariable long id) {
        return ApiResponse.ok(applicants.withdraw(id));
    }

    @GetMapping("/applications/{id}/history")
    @Operation(summary = "Application status history")
    public ApiResponse<List<HistoryView>> history(@PathVariable long id) {
        return ApiResponse.ok(applicants.history(id));
    }

    private static Long parseLong(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return Long.parseLong(value.trim());
        } catch (NumberFormatException ex) {
            return null;
        }
    }
}
