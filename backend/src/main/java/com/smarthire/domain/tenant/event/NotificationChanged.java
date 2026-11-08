package com.smarthire.domain.tenant.event;

/** Published by {@code Notification} on every repository save; exactly one recipient id is set. */
public record NotificationChanged(Long userId, Long candidateId) {}
