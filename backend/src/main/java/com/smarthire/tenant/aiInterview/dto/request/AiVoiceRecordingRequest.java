package com.smarthire.tenant.aiInterview.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import java.math.BigDecimal;
import java.time.Instant;

/** storageKey is issued by the private storage gateway, never a public URL. */
public record AiVoiceRecordingRequest(@NotBlank String storageKey, @NotBlank String mimeType,
        @PositiveOrZero Long sizeBytes, @PositiveOrZero Integer durationSeconds, String transcript,
        BigDecimal transcriptConfidence, String sttProvider, Instant startedAt, Instant endedAt) {}
