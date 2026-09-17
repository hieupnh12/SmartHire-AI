package com.smarthire.tenant.job.controller;

import com.smarthire.common.api.ApiResponse;
import com.smarthire.domain.enums.JobStatus;
import com.smarthire.tenant.cv.dto.CvModels.JobCreateRequest;
import com.smarthire.tenant.cv.dto.CvModels.JobOption;
import com.smarthire.tenant.cv.dto.CvModels.JobSkillView;
import com.smarthire.tenant.cv.dto.CvModels.JobSkillsRequest;
import com.smarthire.tenant.job.dto.JobModels.ApplicationView;
import com.smarthire.tenant.job.dto.JobModels.JobDetail;
import com.smarthire.tenant.job.dto.JobModels.JobPage;
import com.smarthire.tenant.job.dto.JobModels.JobUpsertRequest;
import com.smarthire.tenant.job.dto.JobModels.StageView;
import com.smarthire.tenant.job.dto.JobModels.StagesRequest;
import com.smarthire.tenant.job.service.JobService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/jobs")
@Tag(name = "Job Recruitment")
public class JobController {
    private final JobService jobService;

    public JobController(JobService jobService) {
        this.jobService = jobService;
    }

    @GetMapping("/health")
    @Operation(summary = "Job Recruitment module health")
    public ResponseEntity<ApiResponse<Map<String, String>>> health() {
        return ResponseEntity.ok(ApiResponse.ok(jobService.health()));
    }

    @GetMapping("/published")
    @Operation(summary = "List published jobs for CV upload")
    public ApiResponse<List<JobOption>> published() {
        return ApiResponse.ok(jobService.published());
    }

    @GetMapping("/options")
    @Operation(summary = "List jobs available for CV screening")
    public ApiResponse<List<JobOption>> options() {
        return ApiResponse.ok(jobService.options());
    }

    @GetMapping
    @Operation(summary = "Search recruiter jobs")
    public ApiResponse<JobPage> search(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) JobStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.ok(jobService.search(q, status, page, size));
    }

    @PostMapping
    @Operation(summary = "Create a draft job")
    public ApiResponse<JobDetail> create(@Valid @RequestBody JobUpsertRequest body) {
        return ApiResponse.ok(jobService.create(body));
    }

    @PostMapping("/quick")
    @Operation(summary = "Create and publish a job with default skills for screening")
    public ApiResponse<JobOption> createQuick(@Valid @RequestBody JobCreateRequest body) {
        return ApiResponse.ok(jobService.createQuick(body));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get job detail")
    public ApiResponse<JobDetail> get(@PathVariable long id) {
        return ApiResponse.ok(jobService.get(id));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update job details")
    public ApiResponse<JobDetail> update(@PathVariable long id, @Valid @RequestBody JobUpsertRequest body) {
        return ApiResponse.ok(jobService.update(id, body));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Soft delete a job")
    public ApiResponse<Void> delete(@PathVariable long id) {
        jobService.delete(id);
        return ApiResponse.ok(null);
    }

    @PostMapping("/{id}/clone")
    @Operation(summary = "Clone a job into a new draft")
    public ApiResponse<JobDetail> clone(@PathVariable long id) {
        return ApiResponse.ok(jobService.cloneJob(id));
    }

    @PostMapping("/{id}/publish")
    @Operation(summary = "Publish or resume a job")
    public ApiResponse<JobDetail> publish(@PathVariable long id) {
        return ApiResponse.ok(jobService.publish(id));
    }

    @PostMapping("/{id}/unpublish")
    @Operation(summary = "Move a published job back to draft")
    public ApiResponse<JobDetail> unpublish(@PathVariable long id) {
        return ApiResponse.ok(jobService.unpublish(id));
    }

    @PostMapping("/{id}/pause")
    @Operation(summary = "Pause a published job")
    public ApiResponse<JobDetail> pause(@PathVariable long id) {
        return ApiResponse.ok(jobService.pause(id));
    }

    @PostMapping("/{id}/close")
    @Operation(summary = "Close a job")
    public ApiResponse<JobDetail> close(@PathVariable long id) {
        return ApiResponse.ok(jobService.close(id));
    }

    @PostMapping("/{id}/reopen")
    @Operation(summary = "Reopen a closed or paused job")
    public ApiResponse<JobDetail> reopen(@PathVariable long id) {
        return ApiResponse.ok(jobService.reopen(id));
    }

    @GetMapping("/{id}/skills")
    @Operation(summary = "List job skill requirements")
    public ApiResponse<List<JobSkillView>> skills(@PathVariable long id) {
        return ApiResponse.ok(jobService.skills(id));
    }

    @PutMapping("/{id}/skills")
    @Operation(summary = "Replace job skill requirements used by matching")
    public ApiResponse<List<JobSkillView>> replaceSkills(@PathVariable long id, @Valid @RequestBody JobSkillsRequest body) {
        return ApiResponse.ok(jobService.replaceSkills(id, body));
    }

    @GetMapping("/{id}/stages")
    @Operation(summary = "List recruitment stages")
    public ApiResponse<List<StageView>> stages(@PathVariable long id) {
        return ApiResponse.ok(jobService.listStages(id));
    }

    @PutMapping("/{id}/stages")
    @Operation(summary = "Replace recruitment stages")
    public ApiResponse<List<StageView>> replaceStages(@PathVariable long id, @Valid @RequestBody StagesRequest body) {
        return ApiResponse.ok(jobService.replaceStages(id, body));
    }

    @GetMapping("/{id}/applications")
    @Operation(summary = "List applications for a job")
    public ApiResponse<List<ApplicationView>> applications(@PathVariable long id) {
        return ApiResponse.ok(jobService.applications(id));
    }

    @PostMapping("/{id}/applications")
    @Operation(summary = "Candidate apply to a published job")
    public ApiResponse<ApplicationView> apply(@PathVariable long id, @RequestBody(required = false) Map<String, String> body) {
        String source = body == null ? null : body.get("source");
        return ApiResponse.ok(jobService.apply(id, source));
    }
}
