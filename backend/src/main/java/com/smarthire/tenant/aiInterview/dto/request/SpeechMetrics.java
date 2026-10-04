package com.smarthire.tenant.aiInterview.dto.request;

import jakarta.validation.constraints.*;

/** Browser-measured audio energy timings, supplementary to content scoring. */
public record SpeechMetrics(@Min(0) @Max(10800000) long durationMs,
        @Min(0) @Max(10800000) long voicedMs, @Min(0) @Max(10800000) long silenceMs,
        @Min(0) @Max(10000) int pauseCount, @Min(0) @Max(10800000) Long responseLatencyMs) {
    @AssertTrue(message = "Invalid measured speech durations")
    public boolean isConsistent() { return voicedMs + silenceMs <= durationMs + 200; }
}
