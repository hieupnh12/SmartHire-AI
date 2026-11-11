package com.smarthire.tenant.notification;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.domain.enums.UserRole;
import com.smarthire.domain.enums.UserStatus;
import com.smarthire.domain.tenant.entity.Notification;
import com.smarthire.domain.tenant.entity.User;
import com.smarthire.domain.tenant.repository.NotificationRepository;
import com.smarthire.domain.tenant.repository.UserRepository;
import com.smarthire.tenant.notification.service.TenantAdminNotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TenantAdminNotificationServiceTest {

    @Mock
    private UserRepository users;
    @Mock
    private NotificationRepository notifications;

    private TenantAdminNotificationService service;

    @BeforeEach
    void setUp() {
        service = new TenantAdminNotificationService(users, notifications, new ObjectMapper());
    }

    private User createAdmin(Long id, String email, String role) {
        User u = new User();
        u.setId(id);
        u.setEmail(email);
        u.setFullName("Admin " + id);
        u.setRole(role);
        u.setStatus(UserStatus.ACTIVE);
        return u;
    }

    @Test
    void notifyCompanyAdmins_SavesForEligibleAdminsAndRespectsDbDeduplication() {
        User admin1 = createAdmin(101L, "admin1@acme.vn", UserRole.TENANT_ADMIN.name());
        User admin2 = createAdmin(102L, "admin2@acme.vn", UserRole.ADMIN.name());

        when(users.findByRoleInAndStatus(List.of("TENANT_ADMIN", "ADMIN"), UserStatus.ACTIVE))
                .thenReturn(List.of(admin1, admin2));
        when(notifications.existsByUser_IdAndTypeAndCreatedAtAfter(eq(101L), eq("SUBSCRIPTION_EXPIRY_3D"), any(Instant.class)))
                .thenReturn(false);
        when(notifications.existsByUser_IdAndTypeAndCreatedAtAfter(eq(102L), eq("SUBSCRIPTION_EXPIRY_3D"), any(Instant.class)))
                .thenReturn(true);

        int saved = service.notifyCompanyAdmins(
                "SUBSCRIPTION_EXPIRY_3D",
                "Gói dịch vụ sắp hết hạn (còn 3 ngày)",
                "Chi tiết gia hạn",
                Map.of("milestone", "3D"),
                Instant.now().minusSeconds(86400)
        );

        assertThat(saved).isEqualTo(1);
        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        verify(notifications, times(1)).save(captor.capture());
        Notification created = captor.getValue();
        assertThat(created.getUser().getId()).isEqualTo(101L);
        assertThat(created.getType()).isEqualTo("SUBSCRIPTION_EXPIRY_3D");
        assertThat(created.getTitle()).contains("3 ngày");
        assertThat(created.getPayloadJson()).contains("\"/internal/admin/billing\"").contains("\"3D\"");
    }
}
