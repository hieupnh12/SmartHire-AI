package com.smarthire.tenant.notification;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.tenant.entity.Notification;
import com.smarthire.domain.tenant.entity.User;
import com.smarthire.domain.tenant.repository.NotificationRepository;
import com.smarthire.tenant.cv.service.CvAccess;
import com.smarthire.tenant.notification.service.NotificationService;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {
    @Mock NotificationRepository notifications;
    @Mock CvAccess access;
    @InjectMocks NotificationService service;

    @Test void marksOnlyOwnedNotificationRead() {
        var user = user(9L);
        var notification = Notification.builder().id(3L).user(user).build();
        when(access.actor()).thenReturn(user);
        when(notifications.findByIdAndUser_Id(3L, 9L)).thenReturn(Optional.of(notification));
        assertThat(service.markRead(3L).readAt()).isNotNull();
        var firstRead = notification.getReadAt();
        assertThat(service.markRead(3L).readAt()).isEqualTo(firstRead);
    }

    @Test void cannotMarkAnotherUsersNotificationRead() {
        when(access.actor()).thenReturn(user(99L));
        when(notifications.findByIdAndUser_Id(3L, 99L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.markRead(3L)).isInstanceOf(BusinessException.class);
        verify(notifications, never()).save(any());
    }
    private static User user(long id) {
        User user = new User();
        user.setId(id);
        return user;
    }
}
