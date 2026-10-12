package com.smarthire.tenant.notification.dto;

import com.smarthire.domain.enums.NotificationCategory;
import jakarta.validation.constraints.NotNull;

public record NotificationPreferenceView(@NotNull NotificationCategory category, boolean webEnabled, boolean emailEnabled) {
}
