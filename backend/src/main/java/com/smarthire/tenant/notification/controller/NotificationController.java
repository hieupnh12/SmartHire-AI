package com.smarthire.tenant.notification.controller;

import com.smarthire.common.api.ApiResponse;
import com.smarthire.tenant.notification.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/notifications")
@Tag(name = "Notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping
    @Operation(summary = "List the current user's notification inbox")
    public ApiResponse<java.util.List<com.smarthire.tenant.notification.dto.NotificationView>> mine(
            @org.springframework.web.bind.annotation.RequestParam(defaultValue = "0") int page) {
        return ApiResponse.ok(notificationService.mine(page));
    }

    @org.springframework.web.bind.annotation.PatchMapping("/{id}")
    @Operation(summary = "Mark an owned notification as read")
    public ApiResponse<com.smarthire.tenant.notification.dto.NotificationView> markRead(
            @org.springframework.web.bind.annotation.PathVariable long id) {
        return ApiResponse.ok(notificationService.markRead(id));
    }

    @GetMapping("/health")
    @Operation(summary = "Notifications module scaffold health")
    public ResponseEntity<ApiResponse<Map<String, String>>> health() {
        return ResponseEntity.ok(ApiResponse.ok(notificationService.health()));
    }
}

