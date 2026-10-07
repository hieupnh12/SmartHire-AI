package com.smarthire.tenant.notification.service;

import com.smarthire.domain.enums.NotificationCategory;
import com.smarthire.domain.tenant.entity.NotificationPreference;
import com.smarthire.domain.tenant.entity.User;
import com.smarthire.domain.tenant.repository.NotificationPreferenceRepository;
import com.smarthire.tenant.cv.service.CvAccess;
import com.smarthire.tenant.notification.dto.NotificationPreferenceView;
import java.util.Arrays;
import java.util.List;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NotificationPreferenceService {
    private final NotificationPreferenceRepository preferences;
    private final CvAccess access;

    public NotificationPreferenceService(NotificationPreferenceRepository preferences, CvAccess access) {
        this.preferences = preferences;
        this.access = access;
    }

    @Transactional(readOnly = true)
    public List<NotificationPreferenceView> mine() {
        var saved = preferences.findByUser_Id(access.actor().getId()).stream()
                .collect(Collectors.toMap(NotificationPreference::getCategory, Function.identity()));
        return Arrays.stream(NotificationCategory.values()).map(category -> {
            var row = saved.get(category);
            return row == null
                    ? new NotificationPreferenceView(category, true, true)
                    : new NotificationPreferenceView(category, row.isWebEnabled(), row.isEmailEnabled());
        }).toList();
    }

    @Transactional
    public List<NotificationPreferenceView> update(List<NotificationPreferenceView> changes) {
        User actor = access.actor();
        for (var change : changes) {
            var row = preferences.findByUser_IdAndCategory(actor.getId(), change.category())
                    .orElseGet(() -> NotificationPreference.builder().user(actor).category(change.category()).build());
            row.setWebEnabled(change.webEnabled());
            row.setEmailEnabled(change.emailEnabled());
            preferences.save(row);
        }
        return mine();
    }

    /** Missing rows mean the user never opted out, so both channels stay on. */
    @Transactional(readOnly = true)
    public boolean webOff(User user, NotificationCategory category) {
        return user != null && user.getId() != null && preferences.findByUser_IdAndCategory(user.getId(), category)
                .map(row -> !row.isWebEnabled()).orElse(false);
    }

    @Transactional(readOnly = true)
    public boolean emailOff(User user, NotificationCategory category) {
        return user != null && user.getId() != null && preferences.findByUser_IdAndCategory(user.getId(), category)
                .map(row -> !row.isEmailEnabled()).orElse(false);
    }
}
