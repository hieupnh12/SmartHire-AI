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
        return mine(page, null);
    }

    @Transactional(readOnly = true)
    public List<NotificationView> mine(int page, Long jobId) {
        var pageable = PageRequest.of(Math.max(0, page), 50);
        var pageResult = access.candidate()
                ? (jobId != null
                        ? notifications.findByCandidate_IdAndJobId(access.candidateActor().getId(), jobId, pageable)
                        : notifications.findByCandidate_IdOrderByIdDesc(access.candidateActor().getId(), pageable))
                : (jobId != null
                        ? notifications.findByUser_IdAndJobId(access.actor().getId(), jobId, pageable)
                        : notifications.findByUser_IdOrderByIdDesc(access.actor().getId(), pageable));
        return pageResult.map(NotificationView::from).getContent();
    }

    @Transactional
    public NotificationView markRead(long id) {
        var found = access.candidate()
                ? notifications.findByIdAndCandidate_Id(id, access.candidateActor().getId())
                : notifications.findByIdAndUser_Id(id, access.actor().getId());
        var notification = found.orElseThrow(
                () -> new BusinessException("Notification not found", HttpStatus.NOT_FOUND, "NOTIFICATION_NOT_FOUND"));
        if (notification.getReadAt() == null) notification.setReadAt(Instant.now());
        return NotificationView.from(notification);
    }

    @Transactional
    public int markAllRead() {
        return markAllRead(null);
    }

    @Transactional
    public int markAllRead(Long jobId) {
        var now = Instant.now();
        if (jobId != null) {
            return access.candidate()
                    ? notifications.markAllReadForCandidateAndJob(access.candidateActor().getId(), jobId, now)
                    : notifications.markAllReadForUserAndJob(access.actor().getId(), jobId, now);
        }
        return access.candidate()
                ? notifications.markAllReadForCandidate(access.candidateActor().getId(), now)
                : notifications.markAllReadForUser(access.actor().getId(), now);
    }

    public Map<String, String> health() {
        return Map.of("module", "notification", "status", "scaffold");
    }
}

