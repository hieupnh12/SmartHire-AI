package com.smarthire.tenant.cv.controller;

import com.smarthire.common.api.ApiResponse;
import com.smarthire.tenant.cv.dto.CvModels.CvDetail;
import com.smarthire.tenant.cv.dto.CvModels.CvSummary;
import com.smarthire.tenant.cv.dto.CvModels.MatchView;
import com.smarthire.tenant.cv.service.CvService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1")
@Tag(name = "CV Screening")
public class CvController {
    private final CvService cvs;

    public CvController(CvService cvs) {
        this.cvs = cvs;
    }

    @GetMapping("/cvs/health")
    @Operation(summary = "CV Screening module health")
    public ResponseEntity<ApiResponse<Map<String, String>>> health() {
        return ResponseEntity.ok(ApiResponse.ok(cvs.health()));
    }

    @PostMapping(value = "/cvs", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Candidate upload of a personal CV, or a CV attached to a published job")
    public ResponseEntity<ApiResponse<CvDetail>> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "jobId", required = false) Long jobId,
            @RequestParam(value = "applicationId", required = false) Long applicationId,
            @RequestParam(value = "candidateEmail", required = false) String candidateEmail) {
        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .body(ApiResponse.ok("Queued", cvs.upload(file, jobId, applicationId, candidateEmail)));
    }

    @GetMapping("/cvs/me")
    @Operation(summary = "List CVs uploaded by the current user")
    public ApiResponse<List<CvSummary>> mine() {
        return ApiResponse.ok(cvs.mine());
    }

    @GetMapping("/cvs/{id}/file")
    @Operation(summary = "Download or preview the uploaded CV file")
    public ResponseEntity<byte[]> file(@PathVariable long id) {
        var file = cvs.file(id);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + file.filename().replace("\"", "") + "\"")
                .contentType(MediaType.parseMediaType(file.mimeType()))
                .body(file.content());
    }
    @DeleteMapping("/cvs/{id}")
    @Operation(summary = "Delete a CV (candidate own, or recruiter for the job)")
    public ApiResponse<Void> delete(@PathVariable long id) {
        cvs.delete(id);
        return ApiResponse.ok("Deleted", null);
    }

    @GetMapping("/cvs/{id}")
    @Operation(summary = "Get CV screening status and dataset")
    public ApiResponse<CvDetail> get(@PathVariable long id) {
        return ApiResponse.ok(cvs.get(id));
    }

    @GetMapping("/cvs/{id}/extraction")
    @Operation(summary = "Get structured CV extraction JSON")
    public ApiResponse<CvDetail> extraction(@PathVariable long id) {
        return ApiResponse.ok(cvs.get(id));
    }

    @PostMapping("/cvs/{id}/parse")
    @Operation(summary = "Parse, extract, analyze and match a CV (inline when queues are down)")
    public ApiResponse<CvDetail> parse(@PathVariable long id) {
        return ApiResponse.ok(cvs.processNow(id));
    }

    @PostMapping("/cvs/{id}/extract")
    @Operation(summary = "Enqueue CV information extraction")
    public ResponseEntity<ApiResponse<Void>> extract(@PathVariable long id) {
        cvs.enqueueExtract(id);
        return ResponseEntity.accepted().body(ApiResponse.ok("Queued", null));
    }

    @PostMapping("/cvs/{id}/analyze")
    @Operation(summary = "Enqueue skill taxonomy analysis")
    public ResponseEntity<ApiResponse<Void>> analyze(@PathVariable long id) {
        cvs.enqueueAnalyze(id);
        return ResponseEntity.accepted().body(ApiResponse.ok("Queued", null));
    }

    @GetMapping("/jobs/{jobId}/cvs")
    @Operation(summary = "List CVs for a job (recruiter screening)")
    public ApiResponse<List<CvSummary>> list(@PathVariable long jobId) {
        return ApiResponse.ok(cvs.listByJob(jobId));
    }

    @GetMapping("/jobs/{jobId}/cvs/{cvId}/match")
    @Operation(summary = "Read persisted job-fit screening score")
    public ApiResponse<MatchView> match(@PathVariable long jobId, @PathVariable long cvId) {
        return ApiResponse.ok(cvs.match(jobId, cvId));
    }

    @PostMapping("/jobs/{jobId}/cvs/{cvId}/match")
    @Operation(summary = "Recompute job-fit screening score")
    public ApiResponse<MatchView> recompute(@PathVariable long jobId, @PathVariable long cvId) {
        return ApiResponse.ok(cvs.recomputeMatch(jobId, cvId));
    }
}
