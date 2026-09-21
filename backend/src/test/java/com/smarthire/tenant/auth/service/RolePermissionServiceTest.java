package com.smarthire.tenant.auth.service;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.enums.RecruiterFeature;
import com.smarthire.domain.enums.UserRole;
import com.smarthire.domain.tenant.entity.RolePermission;
import com.smarthire.domain.tenant.repository.RolePermissionRepository;
import com.smarthire.tenant.auth.dto.RolePermissionsResponse;
import com.smarthire.tenant.auth.dto.UpdateRolePermissionsRequest;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RolePermissionServiceTest {

    @Mock
    private RolePermissionRepository rolePermissionRepository;
    @Mock
    private EntityManager entityManager;
    @Mock
    private Query nativeQuery;

    @InjectMocks
    private RolePermissionService rolePermissionService;

    @BeforeEach
    void stubSchema() {
        lenient().when(entityManager.createNativeQuery(anyString())).thenReturn(nativeQuery);
        lenient().when(nativeQuery.executeUpdate()).thenReturn(0);
        lenient().when(nativeQuery.getSingleResult()).thenReturn(1);
        lenient().when(rolePermissionRepository.count()).thenReturn(22L);
    }

    @Test
    void tenantAdminAlwaysHasEveryFeature() {
        assertTrue(rolePermissionService.hasFeature(UserRole.TENANT_ADMIN, RecruiterFeature.JOBS));
        assertEquals(RecruiterFeature.codes(), rolePermissionService.permissionsFor(UserRole.TENANT_ADMIN));
        verify(rolePermissionRepository, never()).existsByRoleAndFeatureCode(any(), any());
    }

    @Test
    void recruiterWithoutGrantIsDenied() {
        when(rolePermissionRepository.existsByRoleAndFeatureCode("RECRUITER", "RANKING")).thenReturn(false);
        assertFalse(rolePermissionService.hasFeature(UserRole.RECRUITER, RecruiterFeature.RANKING));
    }

    @Test
    void customRoleWithoutGrantIsDenied() {
        when(rolePermissionRepository.existsByRoleAndFeatureCode("CV_SCREENING", "JOBS")).thenReturn(false);
        assertFalse(rolePermissionService.hasFeature("CV_SCREENING", RecruiterFeature.JOBS));
    }

    @Test
    void replaceRejectsTenantAdminRole() {
        UpdateRolePermissionsRequest request = UpdateRolePermissionsRequest.builder()
                .grants(Map.of("TENANT_ADMIN", List.of("JOBS")))
                .build();
        BusinessException ex = assertThrows(BusinessException.class, () -> rolePermissionService.replace(request));
        assertEquals("ROLE_NOT_ASSIGNABLE", ex.getCode());
    }

    @Test
    void replacePersistsHrFeatures() {
        when(rolePermissionRepository.findAll()).thenReturn(List.of());
        when(rolePermissionRepository.save(any(RolePermission.class))).thenAnswer(call -> call.getArgument(0));

        RolePermissionsResponse response = rolePermissionService.replace(UpdateRolePermissionsRequest.builder()
                .grants(Map.of("HR", List.of("JOBS", "APPLICANTS")))
                .build());

        ArgumentCaptor<RolePermission> captor = ArgumentCaptor.forClass(RolePermission.class);
        verify(rolePermissionRepository).deleteByRole("HR");
        verify(rolePermissionRepository, times(2)).save(captor.capture());
        assertEquals(List.of("JOBS", "APPLICANTS"),
                captor.getAllValues().stream().map(RolePermission::getFeatureCode).toList());
        assertTrue(response.getAssignableRoles().contains("HR"));
    }
}
