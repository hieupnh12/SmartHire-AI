package com.smarthire.tenant.aiInterview.service;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.common.storage.FileStorageService;
import com.smarthire.domain.tenant.repository.InterviewMessageRepository;
import com.smarthire.multitenancy.context.TenantContext;
import java.io.IOException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

@Service
public class InterviewConversationRecordingService {
    private final InterviewConversationService conversation;
    private final InterviewMessageRepository messages;
    private final FileStorageService storage;
    public InterviewConversationRecordingService(InterviewConversationService conversation, InterviewMessageRepository messages,
            FileStorageService storage) { this.conversation = conversation; this.messages = messages; this.storage = storage; }
    @Transactional
    public void attach(long id, long messageId, MultipartFile file) {
        var interview = conversation.accessible(id, true); conversation.authorizeVoice(id);
        if (!InterviewPolicies.config(interview).policy().voice().recordAudio())
            throw new BusinessException("Recording is disabled", HttpStatus.CONFLICT, "AI_VOICE_DISABLED");
        var message = messages.findById(messageId).filter(value -> value.getSession().getAiInterview().getId().equals(id)
                && "USER".equals(value.getRole())).orElseThrow(() -> new BusinessException("Message not found", HttpStatus.NOT_FOUND, "AI_CONVERSATION_NOT_FOUND"));
        if (message.getRecordingKey() != null) return;
        if (file.isEmpty() || file.getSize() > 9 * 1024 * 1024)
            throw new BusinessException("Invalid audio size", HttpStatus.BAD_REQUEST, "AI_VOICE_BAD_FILE");
        String mime = file.getContentType() == null ? "" : file.getContentType().split(";")[0];
        try {
            byte[] content = file.getBytes(); InterviewConversationService.validateAudio(content, mime);
            String extension = switch (mime) { case "audio/webm" -> "webm"; case "audio/ogg" -> "ogg"; default -> "mp4"; };
            String key = storage.storeInterviewAudio(TenantContext.getCurrentTenant(), content, extension);
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override public void afterCompletion(int status) {
                    if (status != STATUS_COMMITTED) try { storage.deleteInterviewAudio(key); } catch (IOException ignored) {}
                }
            });
            message.setRecordingKey(key); message.setRecordingMime(mime); message.setRecordingSize(file.getSize());
        } catch (IOException ex) {
            throw new BusinessException("Cannot store recording; retry the audio upload", HttpStatus.SERVICE_UNAVAILABLE, "AI_VOICE_STORAGE");
        }
    }
    public record Audio(byte[] content, String mimeType) {}
    @Transactional(readOnly = true)
    public Audio audio(long id, long messageId) {
        var interview = conversation.accessible(id, false);
        if (interview.getCompletedAt() == null)
            throw new BusinessException("Recordings are available after completion", HttpStatus.CONFLICT, "AI_VOICE_NOT_COMPLETE");
        var message = messages.findById(messageId).filter(value -> value.getSession().getAiInterview().getId().equals(id) && value.getRecordingKey() != null)
                .orElseThrow(() -> new BusinessException("Recording not found", HttpStatus.NOT_FOUND, "AI_VOICE_NOT_FOUND"));
        try { return new Audio(storage.readInterviewAudio(message.getRecordingKey()), message.getRecordingMime()); }
        catch (IOException ex) { throw new BusinessException("Cannot load recording", HttpStatus.SERVICE_UNAVAILABLE, "AI_VOICE_STORAGE"); }
    }
}
