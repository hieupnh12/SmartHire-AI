package com.smarthire.tenant.interview.controller;
import com.smarthire.common.api.ApiResponse;
import com.smarthire.tenant.interview.dto.HumanInterviewModels.*;
import com.smarthire.tenant.interview.service.InterviewService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.time.Instant;
import java.util.*;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/api/v1/interviews")
@Tag(name="Human Interview")
public class InterviewController {
    private final InterviewService service;
    public InterviewController(InterviewService service) { this.service=service; }
    @GetMapping("/health") @Operation(summary="Human Interview health")
    public ApiResponse<Map<String,String>> health() { return ApiResponse.ok(service.health()); }
    @GetMapping @Operation(summary="Search human interviews for an authorized job")
    public ApiResponse<PageResult> list(@RequestParam long jobId, @RequestParam(required=false) String q,
        @RequestParam(required=false) String round, @RequestParam(required=false) String mode,
        @RequestParam(required=false) String status, @RequestParam(required=false) Instant from,
        @RequestParam(required=false) Instant to, @RequestParam(defaultValue="0") int page,
        @RequestParam(defaultValue="20") int size) { return ApiResponse.ok(service.list(jobId,q,round,mode,status,from,to,page,size)); }
    @GetMapping("/summary") @Operation(summary="Human interview monthly, RSVP and scorecard counters")
    public ApiResponse<Summary> summary(@RequestParam long jobId, @RequestParam(defaultValue="Asia/Bangkok") String timezone) { return ApiResponse.ok(service.summary(jobId,timezone)); }
    @GetMapping("/options") @Operation(summary="Eligible applications, staff, rounds and rubrics")
    public ApiResponse<Options> options(@RequestParam long jobId) { return ApiResponse.ok(service.options(jobId)); }
    @PostMapping("/availability") @Operation(summary="Check candidate and panel time conflicts")
    public ApiResponse<Availability> availability(@Valid @RequestBody AvailabilityRequest body) { return ApiResponse.ok(service.availability(body)); }
    @PostMapping @Operation(summary="Save a draft or schedule and queue invitations")
    public ResponseEntity<ApiResponse<InterviewView>> create(@Valid @RequestBody SaveRequest body) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.save(null,body))); }
    @PatchMapping("/{id}") @Operation(summary="Edit or reschedule and republish a human interview")
    public ApiResponse<InterviewView> update(@PathVariable long id,@Valid @RequestBody SaveRequest body) { return ApiResponse.ok(service.save(id,body)); }
    @GetMapping("/mine") @Operation(summary="List the current candidate's human interview invitations")
    public ApiResponse<List<InterviewView>> mine() { return ApiResponse.ok(service.mine()); }
    @GetMapping("/{id}") @Operation(summary="Human interview details and scorecards")
    public ApiResponse<InterviewView> get(@PathVariable long id) { return ApiResponse.ok(service.get(id)); }
    @PostMapping("/{id}/confirm") @Operation(summary="Candidate confirms an invitation")
    public ApiResponse<InterviewView> confirm(@PathVariable long id) { return ApiResponse.ok(service.confirm(id)); }
    @PostMapping("/{id}/reschedule-request") @Operation(summary="Candidate proposes a new time")
    public ApiResponse<InterviewView> requestChange(@PathVariable long id,@Valid @RequestBody RescheduleRequest body) { return ApiResponse.ok(service.requestReschedule(id,body)); }
    @PostMapping("/{id}/cancel") @Operation(summary="Cancel an interview and notify participants")
    public ApiResponse<InterviewView> cancel(@PathVariable long id) { return ApiResponse.ok(service.cancel(id)); }
    @PostMapping("/{id}/complete") @Operation(summary="Mark an ended human interview complete")
    public ApiResponse<InterviewView> complete(@PathVariable long id) { return ApiResponse.ok(service.complete(id)); }
    @PostMapping("/{id}/evaluations") @Operation(summary="Panel member saves scorecard; Lead may finalize OFFER/REJECTED on the application")
    public ApiResponse<InterviewView> evaluate(@PathVariable long id,@Valid @RequestBody EvaluationRequest body) { return ApiResponse.ok(service.evaluate(id,body)); }
    @PostMapping("/{id}/remind") @Operation(summary="Queue reminder emails to candidate and panel")
    public ApiResponse<Void> remind(@PathVariable long id) { service.remind(id); return ApiResponse.ok(null); }
    @PostMapping("/bulk") @Operation(summary="Atomically remind, cancel or shift selected interviews")
    public ApiResponse<BulkResult> bulk(@Valid @RequestBody BulkRequest body) { return ApiResponse.ok(service.bulk(body)); }
    @GetMapping("/{id}/email-preview") @Operation(summary="Preview the persisted invitation")
    public ApiResponse<EmailPreview> preview(@PathVariable long id) { return ApiResponse.ok(service.emailPreview(id)); }
    @PostMapping(value = "/{id}/recording", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload a video recording for an interview")
    public ApiResponse<InterviewView> uploadRecording(
            @PathVariable long id,
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file,
            @RequestParam(value = "source", defaultValue = "UPLOAD") String source) {
        return ApiResponse.ok(service.uploadRecording(id, file, source));
    }

    @PostMapping("/{id}/recording-link")
    @Operation(summary = "Attach an external video recording URL for an interview")
    public ApiResponse<InterviewView> attachRecording(
            @PathVariable long id,
            @Valid @RequestBody RecordingRequest body) {
        return ApiResponse.ok(service.attachRecording(id, body));
    }

    @DeleteMapping("/{id}/recording")
    @Operation(summary = "Remove video recording from an interview")
    public ApiResponse<InterviewView> removeRecording(@PathVariable long id) {
        return ApiResponse.ok(service.removeRecording(id));
    }

    @PostMapping("/{id}/chapters")
    @Operation(summary = "Update chapters timeline bookmarks for an interview recording")
    public ApiResponse<InterviewView> updateChapters(
            @PathVariable long id,
            @RequestBody List<Chapter> chapters) {
        return ApiResponse.ok(service.updateChapters(id, chapters));
    }

    @PostMapping("/{id}/chapters/ai-extract")
    @Operation(summary = "Extract chapters automatically using AI based on rubric")
    public ApiResponse<InterviewView> extractAiChapters(@PathVariable long id) {
        return ApiResponse.ok(service.extractAiChapters(id));
    }

    @GetMapping("/recordings/file/{filename}")
    @Operation(summary = "Download or stream local interview recording video")
    public ResponseEntity<org.springframework.core.io.Resource> downloadRecording(@PathVariable String filename) {
        var resource = service.getRecordingFile(filename);
        String mediaType = filename.endsWith(".webm") ? "video/webm" : filename.endsWith(".mov") ? "video/quicktime" : "video/mp4";
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(mediaType))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                .body(resource);
    }

    @GetMapping(value="/export",produces="text/calendar") @Operation(summary="Export published job interviews as ICS")
    public ResponseEntity<String> export(@RequestParam long jobId) { return calendar(service.calendar(jobId)); }
    @GetMapping(value="/{id}/calendar",produces="text/calendar") @Operation(summary="Download a human interview calendar invitation")
    public ResponseEntity<String> exportOne(@PathVariable long id) { return calendar(service.calendarById(id)); }
    private ResponseEntity<String> calendar(String body) { return ResponseEntity.ok().header(HttpHeaders.CONTENT_DISPOSITION,"attachment; filename=interviews.ics").contentType(MediaType.parseMediaType("text/calendar;charset=UTF-8")).body(body); }
}
