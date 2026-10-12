package com.smarthire.tenant.notification;

import com.smarthire.domain.enums.NotificationCategory;
import com.smarthire.domain.tenant.entity.NotificationPreference;
import com.smarthire.domain.tenant.entity.User;
import com.smarthire.domain.tenant.repository.NotificationPreferenceRepository;
import com.smarthire.tenant.cv.service.CvAccess;
import com.smarthire.tenant.notification.dto.NotificationPreferenceView;
import com.smarthire.tenant.notification.service.NotificationPreferenceService;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NotificationPreferenceServiceTest {
    @Mock NotificationPreferenceRepository preferences;
    @Mock CvAccess access;
    @InjectMocks NotificationPreferenceService service;

    @Test void defaultsEveryCategoryToBothChannels() {
        when(access.actor()).thenReturn(user(9L));
        when(preferences.findByUser_Id(9L)).thenReturn(List.of());
        assertThat(service.mine()).hasSize(NotificationCategory.values().length)
                .allMatch(view -> view.webEnabled() && view.emailEnabled());
        assertThat(service.webOff(user(9L), NotificationCategory.ASSESSMENT)).isFalse();
        assertThat(service.emailOff(user(9L), NotificationCategory.ASSESSMENT)).isFalse();
    }

    @Test void savesOptOutForCurrentUserOnly() {
        var actor = user(9L);
        when(access.actor()).thenReturn(actor);
        when(preferences.findByUser_IdAndCategory(9L, NotificationCategory.HUMAN_INTERVIEW)).thenReturn(Optional.empty());
        service.update(List.of(new NotificationPreferenceView(NotificationCategory.HUMAN_INTERVIEW, true, false)));
        var saved = ArgumentCaptor.forClass(NotificationPreference.class);
        verify(preferences).save(saved.capture());
        assertThat(saved.getValue().getUser()).isSameAs(actor);
        assertThat(saved.getValue().isWebEnabled()).isTrue();
        assertThat(saved.getValue().isEmailEnabled()).isFalse();
    }

    @Test void reportsChannelOffFromSavedRow() {
        var row = NotificationPreference.builder().user(user(9L)).category(NotificationCategory.AI_INTERVIEW)
                .webEnabled(false).emailEnabled(true).build();
        when(preferences.findByUser_IdAndCategory(9L, NotificationCategory.AI_INTERVIEW)).thenReturn(Optional.of(row));
        assertThat(service.webOff(user(9L), NotificationCategory.AI_INTERVIEW)).isTrue();
        assertThat(service.emailOff(user(9L), NotificationCategory.AI_INTERVIEW)).isFalse();
    }

    private static User user(long id) {
        User user = new User();
        user.setId(id);
        return user;
    }
}
