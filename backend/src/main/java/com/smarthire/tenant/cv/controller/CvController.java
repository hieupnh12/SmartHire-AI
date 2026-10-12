package com.smarthire.tenant.cv.controller;

import com.smarthire.common.api.ApiResponse;
import com.smarthire.tenant.cv.dto.CvModels.BuilderJobMatchView;
import com.smarthire.tenant.cv.dto.CvModels.CvBuilderData;
import com.smarthire.tenant.cv.dto.CvModels.CvDetail;
import com.smarthire.tenant.cv.dto.CvModels.CvPdfExportRequest;
import com.smarthire.tenant.cv.dto.CvModels.CvSummary;
import com.smarthire.tenant.cv.dto.CvModels.CvWritingRequest;
import com.smarthire.tenant.cv.dto.CvModels.CvWritingView;
import com.smarthire.tenant.cv.dto.CvModels.ImageUploadView;
import com.smarthire.tenant.cv.dto.CvModels.RenameCvRequest;
import com.smarthire.tenant.cv.dto.CvModels.ShareView;
import com.smarthire.tenant.cv.dto.CvModels.SharedCvView;
import com.smarthire.tenant.cv.dto.CvModels.MatchView;
import com.smarthire.tenant.cv.service.CvBuilderAssistService;
import com.smarthire.tenant.cv.service.CvPdfExportService;
import com.smarthire.tenant.cv.service.CvService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1")
@Tag(name = "CV Screening")
public class CvController {
    private final CvService cvs;
    private final CvBuilderAssistService assist;
    private final CvPdfExportService pdfExport;

    public CvController(CvService cvs, CvBuilderAssistService assist, CvPdfExportService pdfExport) {
        this.cvs = cvs;
        this.assist = assist;
        this.pdfExport = pdfExport;
    }

    @GetMapping("/cvs/health")
    @Operation(summary = "CV Screening module health")
    public ResponseEntity<ApiResponse<Map<String, String>>> health() {
        return ResponseEntity.ok(ApiResponse.ok(cvs.health()));
    }

    @PostMapping(value = "/cvs", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Candidate upload of a personal CV, or a CV attached to a published job")
    @com.smarthire.multitenancy.quota.RequireMeteredQuota(type = com.smarthire.multitenancy.quota.QuotaType.CV_PARSE)
    public ResponseEntity<ApiResponse<CvDetail>> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "jobId", required = false) Long jobId,
            @RequestParam(value = "applicationId", required = false) Long applicationId,
            @RequestParam(value = "candidateEmail", required = false) String candidateEmail) {
        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .body(ApiResponse.ok("Queued", cvs.upload(file, jobId, applicationId, candidateEmail)));
    }

    @PostMapping("/cvs/builder")
    @Operation(summary = "Save a CV built in the CV Builder: render it to PDF and queue parsing")
    @com.smarthire.multitenancy.quota.RequireMeteredQuota(type = com.smarthire.multitenancy.quota.QuotaType.CV_PARSE)
    public ResponseEntity<ApiResponse<CvDetail>> createFromBuilder(@Valid @RequestBody CvBuilderData data) {
        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .body(ApiResponse.ok("Queued", cvs.createFromBuilder(data)));
    }

    @PutMapping("/cvs/{id}/builder")
    @Operation(summary = "Update a CV Builder CV: re-render the PDF and re-run parsing")
    @com.smarthire.multitenancy.quota.RequireMeteredQuota(type = com.smarthire.multitenancy.quota.QuotaType.CV_PARSE)
    public ResponseEntity<ApiResponse<CvDetail>> updateFromBuilder(@PathVariable long id, @Valid @RequestBody CvBuilderData data) {
        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .body(ApiResponse.ok("Queued", cvs.updateFromBuilder(id, data)));
    }

    @PostMapping(value = "/cvs/builder/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload a CV Builder avatar image (JPG/PNG/WEBP, max 2MB)")
    public ApiResponse<ImageUploadView> uploadAvatar(@RequestParam("file") MultipartFile file) {
        return ApiResponse.ok(cvs.uploadAvatar(file));
    }

    @PostMapping("/cvs/builder/suggestions")
    @Operation(summary = "AI writing suggestions for a CV Builder summary or item description (3 alternatives)")
    public ApiResponse<CvWritingView> suggest(@Valid @RequestBody CvWritingRequest request) {
        return ApiResponse.ok(assist.suggest(request));
    }

    @PostMapping("/cvs/builder/job-match")
    @Operation(summary = "Check the CV being edited against a published job's skills (not persisted)")
    public ApiResponse<BuilderJobMatchView> jobMatch(@RequestParam long jobId, @Valid @RequestBody CvBuilderData data) {
        return ApiResponse.ok(assist.jobMatch(jobId, data));
    }

    @PostMapping("/cvs/builder/pdf")
    @Operation(summary = "Export the CV Builder sheet (rendered HTML + CSS) as a downloadable A4 PDF")
    public ResponseEntity<byte[]> exportPdf(@Valid @RequestBody CvPdfExportRequest request) {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"cv.pdf\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdfExport.export(request.html(), request.css()));
    }

    @PostMapping("/cvs/{id}/duplicate")
    @Operation(summary = "Duplicate a CV Builder CV (re-renders and re-parses the copy)")
    @com.smarthire.multitenancy.quota.RequireMeteredQuota(type = com.smarthire.multitenancy.quota.QuotaType.CV_PARSE)
    public ResponseEntity<ApiResponse<CvDetail>> duplicate(@PathVariable long id) {
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(ApiResponse.ok("Queued", cvs.duplicate(id)));
    }

    @PatchMapping("/cvs/{id}/name")
    @Operation(summary = "Rename one of the current user's CVs (extension is kept)")
    public ApiResponse<CvDetail> rename(@PathVariable long id, @Valid @RequestBody RenameCvRequest request) {
        return ApiResponse.ok(cvs.rename(id, request.name()));
    }

    @PostMapping("/cvs/{id}/share")
    @Operation(summary = "Enable the public share link of a CV Builder CV")
    public ApiResponse<ShareView> share(@PathVariable long id) {
        return ApiResponse.ok(cvs.share(id));
    }

    @DeleteMapping("/cvs/{id}/share")
    @Operation(summary = "Disable the public share link (old links stop working)")
    public ApiResponse<Void> unshare(@PathVariable long id) {
        cvs.unshare(id);
        return ApiResponse.ok("Unshared", null);
    }

    @GetMapping("/public/cvs/{token}")
    @Operation(summary = "Public read-only view of a shared CV Builder CV")
    public ApiResponse<SharedCvView> shared(@PathVariable String token) {
        return ApiResponse.ok(cvs.shared(token));
    }

    @GetMapping("/cvs/me")
    @Operation(summary = "List CVs uploaded by the current user")
    public ApiResponse<List<CvSummary>> mine() {
        return ApiResponse.ok(cvs.mine());
    }

    @GetMapping("/cvs/{id}/file")
    @Operation(summary = "Preview the uploaded CV inline in the browser")
    public ResponseEntity<byte[]> file(@PathVariable long id) {
        var file = cvs.file(id);
        boolean pdf = file.filename() != null && file.filename().toLowerCase().endsWith(".pdf");
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline")
                .contentType(pdf ? MediaType.APPLICATION_PDF : MediaType.APPLICATION_OCTET_STREAM)
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
    @com.smarthire.multitenancy.quota.RequireMeteredQuota(type = com.smarthire.multitenancy.quota.QuotaType.CV_PARSE, count = 0)
    public ApiResponse<CvDetail> parse(@PathVariable long id) {
        return ApiResponse.ok(cvs.processNow(id));
    }

    @PostMapping("/cvs/{id}/extract")
    @Operation(summary = "Enqueue CV information extraction")
    @com.smarthire.multitenancy.quota.RequireMeteredQuota(type = com.smarthire.multitenancy.quota.QuotaType.CV_PARSE, count = 0)
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
