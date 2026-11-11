package com.smarthire.tenant.notification.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.domain.enums.UserRole;
import com.smarthire.domain.enums.UserStatus;
import com.smarthire.domain.tenant.entity.Notification;
import com.smarthire.domain.tenant.entity.User;
import com.smarthire.domain.tenant.repository.NotificationRepository;
import com.smarthire.domain.tenant.repository.UserRepository;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/**
 * Writes workspace-level billing, subscription expiry, and quota warning notifications
 * into the active tenant's {@code notifications} inbox for company administrators.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TenantAdminNotificationService {

    private final UserRepository users;
    private final NotificationRepository notifications;
    private final ObjectMapper json;

    @Transactional(value = "tenantTransactionManager", propagation = Propagation.REQUIRES_NEW)
    public int notifyCompanyAdmins(
            String type,
            String title,
            String body,
            Map<String, Object> payloadMap,
            Instant dedupAfter) {
        if (!StringUtils.hasText(type) || !StringUtils.hasText(title)) {
            return 0;
        }
        List<User> admins = users.findByRoleInAndStatus(
                List.of(UserRole.TENANT_ADMIN.name(), UserRole.ADMIN.name()),
                UserStatus.ACTIVE);
        if (admins == null || admins.isEmpty()) {
            return 0;
        }

        String payloadJson = serializePayload(payloadMap);
        int sentCount = 0;
        for (User admin : admins) {
            if (admin == null || admin.getId() == null) {
                continue;
            }
            try {
                if (dedupAfter != null
                        && notifications.existsByUser_IdAndTypeAndCreatedAtAfter(admin.getId(), type, dedupAfter)) {
                    continue;
                }
                notifications.save(Notification.builder()
                        .user(admin)
                        .type(type)
                        .title(title)
                        .body(body)
                        .payloadJson(payloadJson)
                        .build());
                sentCount++;
            } catch (Exception ex) {
                log.warn("Skipped tenant admin notification {} for user {}: {}", type, admin.getId(), ex.getMessage());
            }
        }
        return sentCount;
    }

    private String serializePayload(Map<String, Object> payloadMap) {
        Map<String, Object> data = new LinkedHashMap<>();
        if (payloadMap != null) {
            data.putAll(payloadMap);
        }
        data.putIfAbsent("path", "/internal/admin/billing");
        try {
            return json.writeValueAsString(data);
        } catch (Exception ex) {
            return "{\"path\":\"/internal/admin/billing\"}";
        }
    }
}
