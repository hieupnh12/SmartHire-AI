package com.smarthire.tenant.aiInterview.controller;

import com.smarthire.common.api.ApiResponse;
import com.smarthire.domain.enums.AiInterviewStatus;
import com.smarthire.tenant.aiInterview.dto.request.AiQuestionRequest;
import com.smarthire.tenant.aiInterview.dto.request.CreateAiInterviewRequest;
import com.smarthire.tenant.aiInterview.dto.request.UpdateAiInterviewRequest;
import com.smarthire.tenant.aiInterview.dto.request.UpsertAiAnswerRequest;
import com.smarthire.tenant.aiInterview.dto.request.UpsertAiFeedbackRequest;
import com.smarthire.tenant.aiInterview.dto.response.AiAnswerResponse;
import com.smarthire.tenant.aiInterview.dto.response.AiFeedbackResponse;
import com.smarthire.tenant.aiInterview.dto.response.AiInterviewLogResponse;
import com.smarthire.tenant.aiInterview.dto.response.AiInterviewPage;
import com.smarthire.tenant.aiInterview.dto.response.AiInterviewResponse;
import com.smarthire.tenant.aiInterview.dto.response.AiQuestionResponse;
import com.smarthire.tenant.aiInterview.service.AiInterviewService;
import com.smarthire.tenant.aiInterview.service.AiInterviewVoiceService;
import com.smarthire.tenant.aiInterview.dto.request.AiInterviewConsentRequest;
import com.smarthire.tenant.aiInterview.dto.request.AiVoiceRecordingRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
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
@RequestMapping("/api/v1/ai-interviews")
@Tag(name = "AI Interview Sessions")
public class AiInterviewController {

    private final AiInterviewService aiInterviewService;
    private final AiInterviewVoiceService voiceService;

    public AiInterviewController(AiInterviewService aiInterviewService, AiInterviewVoiceService voiceService) {
        this.aiInterviewService = aiInterviewService; this.voiceService = voiceService;
    }

    @PostMapping
    @Operation(summary = "Create AI interview session (staff)")
    public ResponseEntity<ApiResponse<AiInterviewResponse>> create(
            @Valid @RequestBody CreateAiInterviewRequest request) {
        return ResponseEntity.status(201).body(ApiResponse.ok(aiInterviewService.create(request)));
    }

    @GetMapping
    @Operation(summary = "List AI interview sessions (staff)")
    public ApiResponse<AiInterviewPage> list(
            @RequestParam(required = false) Long applicationId,
            @RequestParam(required = false) AiInterviewStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.ok(aiInterviewService.list(applicationId, status, page, size));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get AI interview with questions/answers/feedback")
    public ApiResponse<AiInterviewResponse> get(@PathVariable long id) {
        return ApiResponse.ok(aiInterviewService.get(id));
    }

    @GetMapping("/me")
    @Operation(summary = "List AI interview invitations for the current candidate")
    public ApiResponse<java.util.List<AiInterviewResponse>> mine() {
        return ApiResponse.ok(aiInterviewService.mine());
    }

    @PostMapping("/applications/{applicationId}/start")
    @Operation(summary = "Request to begin the AI interview round of an owned application (candidate)",
            description = "Requires CV screening PASSED, AI interview enabled/available on the job and the application in"
                    + " the INTERVIEW round. Creates an attempt from the job snapshot and queues question generation."
                    + " A failed attempt can start another one only while retries and the deadline remain."
                    + " A provider failure retries the same attempt and does not consume an attempt.")
    public ApiResponse<AiInterviewResponse> requestStart(@PathVariable long applicationId) {
        return ApiResponse.ok(aiInterviewService.requestStart(applicationId));
    }

    @GetMapping("/{id}/logs")
    @Operation(summary = "Activity log of every AI interview pipeline step (staff)")
    public ApiResponse<java.util.List<AiInterviewLogResponse>> logs(@PathVariable long id) {
        return ApiResponse.ok(aiInterviewService.logs(id));
    }

    @PostMapping("/{id}/start")
    @Operation(summary = "Start an owned interview with ready questions (candidate)")
    public ApiResponse<AiInterviewResponse> start(@PathVariable long id) {
        return ApiResponse.ok(aiInterviewService.start(id));
    }

    @PostMapping("/{id}/voice/consent")
    @Operation(summary = "Record the candidate's consent before a voice AI interview")
    public ApiResponse<Void> consent(@PathVariable long id, @Valid @RequestBody AiInterviewConsentRequest request) {
        voiceService.consent(id, request); return ApiResponse.ok(null);
    }

    @PostMapping("/{id}/answers/{answerId}/recording")
    @Operation(summary = "Attach private voice recording metadata to an owned answer")
    public ApiResponse<Void> recording(@PathVariable long id, @PathVariable long answerId, @Valid @RequestBody AiVoiceRecordingRequest request) {
        voiceService.saveRecording(id, answerId, request); return ApiResponse.ok(null);
    }

    @PostMapping("/{id}/questions/generate")
    @Operation(summary = "Queue real AI questions or retry failed generation (staff)")
    public ApiResponse<AiInterviewResponse> generate(@PathVariable long id) {
        return ApiResponse.ok(aiInterviewService.generate(id));
    }

    @PostMapping("/{id}/score")
    @Operation(summary = "Retry a failed AI evaluation without creating another attempt (staff)")
    public ApiResponse<AiInterviewResponse> score(@PathVariable long id) {
        return ApiResponse.ok(aiInterviewService.retryScore(id));
    }

    @PostMapping("/{id}/complete")
    @Operation(summary = "Submit all answers in an owned interview (candidate)")
    public ApiResponse<AiInterviewResponse> complete(@PathVariable long id) {
        return ApiResponse.ok(aiInterviewService.complete(id));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update AI interview session (staff)")
    public ApiResponse<AiInterviewResponse> update(
            @PathVariable long id,
            @Valid @RequestBody UpdateAiInterviewRequest request) {
        return ApiResponse.ok(aiInterviewService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete AI interview and nested data (staff)")
    public ApiResponse<Void> delete(@PathVariable long id) {
        aiInterviewService.delete(id);
        return ApiResponse.ok(null);
    }

    @PostMapping("/{id}/questions")
    @Operation(summary = "Add question to AI interview (staff)")
    public ResponseEntity<ApiResponse<AiQuestionResponse>> addQuestion(
            @PathVariable long id,
            @Valid @RequestBody AiQuestionRequest request) {
        return ResponseEntity.status(201).body(ApiResponse.ok(aiInterviewService.addQuestion(id, request)));
    }

    @PutMapping("/{id}/questions/{questionId}")
    @Operation(summary = "Update AI interview question (staff)")
    public ApiResponse<AiQuestionResponse> updateQuestion(
            @PathVariable long id,
            @PathVariable long questionId,
            @Valid @RequestBody AiQuestionRequest request) {
        return ApiResponse.ok(aiInterviewService.updateQuestion(id, questionId, request));
    }

    @DeleteMapping("/{id}/questions/{questionId}")
    @Operation(summary = "Delete AI interview question (staff)")
    public ApiResponse<Void> deleteQuestion(@PathVariable long id, @PathVariable long questionId) {
        aiInterviewService.deleteQuestion(id, questionId);
        return ApiResponse.ok(null);
    }

    @PutMapping("/{id}/questions/{questionId}/answer")
    @Operation(summary = "Upsert answer for a question (staff or owning candidate)")
    public ApiResponse<AiAnswerResponse> upsertAnswer(
            @PathVariable long id,
            @PathVariable long questionId,
            @Valid @RequestBody UpsertAiAnswerRequest request) {
        return ApiResponse.ok(aiInterviewService.upsertAnswer(id, questionId, request));
    }

    @PutMapping("/{id}/answers/{answerId}/feedback")
    @Operation(summary = "Upsert feedback for an answer (staff)")
    public ApiResponse<AiFeedbackResponse> upsertFeedback(
            @PathVariable long id,
            @PathVariable long answerId,
            @Valid @RequestBody UpsertAiFeedbackRequest request) {
        return ApiResponse.ok(aiInterviewService.upsertFeedback(id, answerId, request));
    }
}
