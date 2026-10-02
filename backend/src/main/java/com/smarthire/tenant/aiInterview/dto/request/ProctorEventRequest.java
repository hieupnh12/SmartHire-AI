package com.smarthire.tenant.aiInterview.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ProctorEventRequest(
        @NotBlank
        @Pattern(regexp = "FULLSCREEN_EXIT|PAGE_HIDDEN|WINDOW_BLUR|COPY_ATTEMPT|PASTE_ATTEMPT|CONTEXT_MENU|BLOCKED_SHORTCUT|CAMERA_LOST|MICROPHONE_LOST|SCREEN_SHARE_STOPPED|HEARTBEAT")
        String event,
        @Size(max = 200) String detail,
        @Min(0) @Max(86_400) Long durationSeconds) {
}
