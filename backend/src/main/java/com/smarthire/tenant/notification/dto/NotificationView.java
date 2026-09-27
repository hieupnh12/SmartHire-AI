package com.smarthire.tenant.notification.dto;

import com.smarthire.domain.tenant.entity.Notification;
import java.time.Instant;

public record NotificationView(Long id, String type, String title, String body, String payloadJson,
                               Instant readAt, Instant createdAt) {
    public static NotificationView from(Notification notification) {
        return new NotificationView(notification.getId(), notification.getType(), notification.getTitle(),
                notification.getBody(), notification.getPayloadJson(), notification.getReadAt(), notification.getCreatedAt());
    }
}
