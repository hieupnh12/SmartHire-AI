package com.smarthire.tenant.notification.service;

import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.tenant.repository.NotificationRepository;
import com.smarthire.tenant.cv.service.CvAccess;
import com.smarthire.tenant.notification.dto.NotificationView;
import java.time.Instant;
import java.util.List;

@Service
public class NotificationService {
    private final NotificationRepository notifications;
    private final CvAccess access;

    public NotificationService(NotificationRepository notifications, CvAccess access) {
        this.notifications = notifications;
        this.access = access;
    }

    @Transactional(readOnly = true)
    public List<NotificationView> mine(int page) {
        return notifications.findByUser_IdOrderByIdDesc(access.actor().getId(), PageRequest.of(Math.max(0, page), 50))
                .map(NotificationView::from).getContent();
    }

    @Transactional
    public NotificationView markRead(long id) {
        var notification = notifications.findByIdAndUser_Id(id, access.actor().getId())
                .orElseThrow(() -> new BusinessException("Notification not found", HttpStatus.NOT_FOUND, "NOTIFICATION_NOT_FOUND"));
        if (notification.getReadAt() == null) notification.setReadAt(Instant.now());
        return NotificationView.from(notification);
    }

    public Map<String, String> health() {
        return Map.of("module", "notification", "status", "scaffold");
    }
}

