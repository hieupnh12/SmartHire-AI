package com.smarthire.tenant.auth.service;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.enums.RoleWorkspace;
import com.smarthire.domain.enums.UserStatus;
import com.smarthire.domain.tenant.entity.TenantRole;
import com.smarthire.domain.tenant.entity.User;
import com.smarthire.domain.tenant.repository.UserRepository;
import com.smarthire.tenant.auth.dto.UserResponse;
import com.smarthire.tenant.auth.mapper.AuthMapper;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mapstruct.factory.Mappers;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TenantUserServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Spy
    private AuthMapper authMapper = Mappers.getMapper(AuthMapper.class);
    @Mock
    private TenantRoleService tenantRoleService;

    @InjectMocks
    private TenantUserService tenantUserService;

    @Test
    void assignRoleUpdatesStaffUser() {
        User user = staff(3L, "HR");
        TenantRole screening = role("CV_SCREENING", "CV Screening", RoleWorkspace.RECRUITER);
        when(userRepository.findById(3L)).thenReturn(Optional.of(user));
        when(tenantRoleService.requireAssignable("CV_SCREENING")).thenReturn(screening);
        when(userRepository.save(any(User.class))).thenAnswer(call -> call.getArgument(0));

        UserResponse response = tenantUserService.assignRole(3L, "CV_SCREENING");

        assertEquals("CV_SCREENING", response.getRole());
        assertEquals("RECRUITER", response.getWorkspace());
        assertEquals("CV_SCREENING", user.getRole());
    }

    @Test
    void getEmployeesExcludesCandidates() {
        when(userRepository.findAll()).thenReturn(List.of(staff(1L, "HR"), staff(2L, "CANDIDATE")));

        List<UserResponse> employees = tenantUserService.getEmployees();

        assertEquals(1, employees.size());
        assertEquals("HR", employees.get(0).getRole());
    }

    @Test
    void assignRoleRejectsCandidateAccount() {
        when(userRepository.findById(8L)).thenReturn(Optional.of(staff(8L, "CANDIDATE")));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> tenantUserService.assignRole(8L, "HR"));
        assertEquals("USER_NOT_STAFF", ex.getCode());
    }

    private static User staff(Long id, String role) {
        User user = new User();
        user.setId(id);
        user.setEmail("user@tenant.test");
        user.setFullName("Staff");
        user.setRole(role);
        user.setStatus(UserStatus.ACTIVE);
        return user;
    }

    private static TenantRole role(String code, String name, RoleWorkspace workspace) {
        TenantRole tenantRole = new TenantRole();
        tenantRole.setCode(code);
        tenantRole.setName(name);
        tenantRole.setWorkspace(workspace);
        tenantRole.setSystem(false);
        return tenantRole;
    }
}
