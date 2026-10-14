package com.smarthire.tenant.aiInterview.controller;

import com.smarthire.common.api.ApiResponse;
import com.smarthire.messaging.TenantJobExecutor;
import com.smarthire.multitenancy.context.TenantContext;
import com.smarthire.tenant.aiInterview.dto.request.ConversationTurnRequest;
import com.smarthire.tenant.aiInterview.dto.response.ConversationResponse;
import com.smarthire.tenant.aiInterview.realtime.InterviewVoiceTickets;
import com.smarthire.tenant.aiInterview.service.InterviewConversationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.io.IOException;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.task.TaskExecutor;
import org.springframework.http.*;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController @RequestMapping("/api/v1/ai-interviews/{id}/conversation")
@Tag(name = "AI Interview Conversation")
public class InterviewConversationController {
    private final InterviewConversationService conversation;
    private final InterviewVoiceTickets tickets;
    private final TenantJobExecutor tenants;
    private final TaskExecutor executor;
    private final com.smarthire.tenant.aiInterview.service.InterviewConversationRecordingService recordings;
    public InterviewConversationController(InterviewConversationService conversation, InterviewVoiceTickets tickets,
            TenantJobExecutor tenants, @Qualifier("interviewConversationExecutor") TaskExecutor executor,
            com.smarthire.tenant.aiInterview.service.InterviewConversationRecordingService recordings) {
        this.conversation = conversation; this.tickets = tickets; this.tenants = tenants; this.executor = executor;
        this.recordings = recordings;
    }
    @GetMapping @Operation(summary = "Conversation transcript (owning candidate or assigned staff after completion)")
    public ApiResponse<ConversationResponse> get(@PathVariable long id) { return ApiResponse.ok(conversation.get(id)); }

    @PostMapping(value = "/turns", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @Operation(summary = "Send one candidate turn and stream AI reply", description = "Events: delta{text}, done{ConversationResponse}, error{message}. Reuse requestId on retry.")
    @com.smarthire.multitenancy.quota.RequireMeteredQuota(type = com.smarthire.multitenancy.quota.QuotaType.AI_VOICE_SECONDS, count = 0)
    public ResponseEntity<SseEmitter> turn(@PathVariable long id, @Valid @RequestBody ConversationTurnRequest request) {
        conversation.get(id);
        String tenant = TenantContext.getCurrentTenant();
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        var emitter = new SseEmitter(90000L); var cancelled = new AtomicBoolean();
        emitter.onCompletion(() -> cancelled.set(true)); emitter.onTimeout(() -> { cancelled.set(true); emitter.complete(); });
        emitter.onError(error -> cancelled.set(true));
        executor.execute(() -> {
            if (cancelled.get()) return;
            var context = SecurityContextHolder.createEmptyContext(); context.setAuthentication(authentication);
            SecurityContextHolder.setContext(context);
            try {
                tenants.execute(tenant, () -> {
                    var result = conversation.turn(id, request, delta -> {
                        if (cancelled.get()) throw new IllegalStateException("Conversation stream disconnected");
                        send(emitter, "delta", Map.of("text", delta));
                    });
                    // Transaction has committed before the final event acknowledges persisted history.
                    send(emitter, "done", result);
                });
                emitter.complete();
            } catch (Exception ex) {
                if (!cancelled.get()) {
                    try { send(emitter, "error", Map.of("message", "AI response failed. Retry the same message; your draft is preserved.")); }
                    catch (RuntimeException ignored) {}
                    emitter.complete();
                }
            } finally { SecurityContextHolder.clearContext(); }
        });
        // MVC completes this request on another thread; do not leave tenant context on the original thread.
        TenantContext.clear();
        return ResponseEntity.ok().header("X-Accel-Buffering", "no").header("Cache-Control", "no-store").body(emitter);
    }
    @PostMapping("/voice-ticket") @Operation(summary = "Issue a single-use voice WebSocket ticket (60 seconds)")
    @com.smarthire.multitenancy.quota.RequireMeteredQuota(type = com.smarthire.multitenancy.quota.QuotaType.AI_VOICE_SECONDS, count = 0)
    public ApiResponse<Map<String, String>> ticket(@PathVariable long id) { return ApiResponse.ok(Map.of("ticket", tickets.issue(id))); }

    @PostMapping("/messages/{messageId}/speech") @Operation(summary = "Generate API TTS audio for a stored AI message")
    @com.smarthire.multitenancy.quota.RequireMeteredQuota(type = com.smarthire.multitenancy.quota.QuotaType.AI_VOICE_SECONDS, count = 0)
    public ResponseEntity<byte[]> speech(@PathVariable long id, @PathVariable long messageId) {
        return ResponseEntity.ok().contentType(MediaType.parseMediaType("audio/wav"))
                .header("Cache-Control", "no-store").body(conversation.speech(id, messageId));
    }
    @PostMapping(value = "/messages/{messageId}/recording", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Attach private audio to a committed candidate message")
    @com.smarthire.multitenancy.quota.RequireMeteredQuota(type = com.smarthire.multitenancy.quota.QuotaType.AI_VOICE_SECONDS, count = 0)
    public ApiResponse<Void> recording(@PathVariable long id, @PathVariable long messageId,
            @RequestPart("file") org.springframework.web.multipart.MultipartFile file) {
        recordings.attach(id, messageId, file); return ApiResponse.ok(null);
    }
    @GetMapping("/messages/{messageId}/recording") @Operation(summary = "Read private recording after completion")
    public ResponseEntity<byte[]> recording(@PathVariable long id, @PathVariable long messageId) {
        var audio = recordings.audio(id, messageId);
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(audio.mimeType())).header("Cache-Control", "no-store").body(audio.content());
    }
    private static void send(SseEmitter emitter, String event, Object data) {
        try { emitter.send(SseEmitter.event().name(event).data(data)); }
        catch (IOException ex) { throw new IllegalStateException("Conversation stream disconnected"); }
    }
}
