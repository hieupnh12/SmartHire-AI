package com.smarthire.tenant.aiInterview.dto.response;

import java.time.Instant;
import java.util.List;

public record ConversationResponse(long sessionId, int candidateTurns, int maxTurns, boolean dialogueComplete,
        String language, List<Message> messages) {
    public record Message(Long id, int sequenceNo, String role, String content, String requestId,
            boolean hasRecording, Instant createdAt) {}
}
