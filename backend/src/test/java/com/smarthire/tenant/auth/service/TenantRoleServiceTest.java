package com.smarthire.tenant.auth.service;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.enums.RoleWorkspace;
import com.smarthire.domain.tenant.entity.TenantRole;
import com.smarthire.domain.tenant.repository.MemberInvitationRepository;
import com.smarthire.domain.tenant.repository.TenantRoleRepository;
import com.smarthire.domain.tenant.repository.UserRepository;
import com.smarthire.tenant.auth.dto.CreateTenantRoleRequest;
import com.smarthire.tenant.auth.dto.TenantRoleResponse;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TenantRoleServiceTest {

    @Mock
    private TenantRoleRepository tenantRoleRepository;
    @Mock
    private RolePermissionService rolePermissionService;
    @Mock
    private UserRepository userRepository;
    @Mock
    private MemberInvitationRepository invitationRepository;

    @InjectMocks
    private TenantRoleService tenantRoleService;

    @Test
    void createPersistsRecruiterRoleAndFeatures() {
        when(tenantRoleRepository.existsByCode("CV_SCREENING")).thenReturn(false);
        when(tenantRoleRepository.save(any(TenantRole.class))).thenAnswer(call -> {
            TenantRole role = call.getArgument(0);
            role.setId(9L);
            return role;
        });
        when(rolePermissionService.permissionsFor(anyString())).thenReturn(List.of("CV_SCREENING", "APPLICANTS"));

        TenantRoleResponse response = tenantRoleService.create(CreateTenantRoleRequest.builder()
                .name("CV Screening")
                .features(List.of("CV_SCREENING", "APPLICANTS"))
                .build());

        ArgumentCaptor<TenantRole> captor = ArgumentCaptor.forClass(TenantRole.class);
        verify(tenantRoleRepository).save(captor.capture());
        assertEquals("CV_SCREENING", captor.getValue().getCode());
        assertFalse(captor.getValue().isSystem());
        assertEquals(RoleWorkspace.RECRUITER, captor.getValue().getWorkspace());
        verify(rolePermissionService).replaceFeatures("CV_SCREENING", List.of("CV_SCREENING", "APPLICANTS"));
        assertEquals(9L, response.getId());
        assertEquals("CV_SCREENING", response.getCode());
    }

    @Test
    void deleteRejectsSystemRole() {
        TenantRole hr = new TenantRole();
        hr.setId(1L);
        hr.setCode("HR");
        hr.setName("HR");
        hr.setWorkspace(RoleWorkspace.RECRUITER);
        hr.setSystem(true);
        when(tenantRoleRepository.findById(1L)).thenReturn(Optional.of(hr));

        BusinessException ex = assertThrows(BusinessException.class, () -> tenantRoleService.delete(1L));
        assertEquals("ROLE_PROTECTED", ex.getCode());
    }

    @Test
    void deleteRejectsAdminEvenIfNotMarkedSystem() {
        TenantRole admin = new TenantRole();
        admin.setId(2L);
        admin.setCode("ADMIN");
        admin.setName("Admin");
        admin.setWorkspace(RoleWorkspace.ADMIN);
        admin.setSystem(false);
        when(tenantRoleRepository.findById(2L)).thenReturn(Optional.of(admin));

        BusinessException ex = assertThrows(BusinessException.class, () -> tenantRoleService.delete(2L));
        assertEquals("ROLE_PROTECTED", ex.getCode());
    }

    @Test
    void deleteRemovesUnusedCustomRole() {
        TenantRole custom = new TenantRole();
        custom.setId(9L);
        custom.setCode("CV_SCREENING");
        custom.setName("CV Screening");
        custom.setWorkspace(RoleWorkspace.RECRUITER);
        custom.setSystem(false);
        when(tenantRoleRepository.findById(9L)).thenReturn(Optional.of(custom));
        when(userRepository.existsByRole("CV_SCREENING")).thenReturn(false);
        when(invitationRepository.existsByRoleAndStatus("CV_SCREENING",
                com.smarthire.domain.enums.InvitationStatus.PENDING)).thenReturn(false);

        tenantRoleService.delete(9L);

        verify(rolePermissionService).deleteFeatures("CV_SCREENING");
        verify(tenantRoleRepository).delete(custom);
    }

    @Test
    void requireAssignableRejectsCandidate() {
        TenantRole candidate = new TenantRole();
        candidate.setCode("CANDIDATE");
        candidate.setName("Candidate");
        candidate.setWorkspace(RoleWorkspace.CANDIDATE);
        candidate.setSystem(true);
        when(tenantRoleRepository.findByCode("CANDIDATE")).thenReturn(Optional.of(candidate));

        BusinessException ex = assertThrows(BusinessException.class, () -> tenantRoleService.requireAssignable("CANDIDATE"));
        assertEquals("INVALID_ROLE", ex.getCode());
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
    }
}
