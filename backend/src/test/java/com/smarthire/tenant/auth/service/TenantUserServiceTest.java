package com.smarthire.tenant.auth.service;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.common.redis.RedisService;
import com.smarthire.domain.enums.RoleWorkspace;
import com.smarthire.domain.enums.UserStatus;
import com.smarthire.domain.tenant.entity.Job;
import com.smarthire.domain.tenant.entity.TenantRole;
import com.smarthire.domain.tenant.entity.User;
import com.smarthire.domain.tenant.repository.JobRepository;
import com.smarthire.domain.tenant.repository.UserRepository;
import com.smarthire.multitenancy.context.TenantContext;
import com.smarthire.tenant.auth.dto.UpdateUserStatusRequest;
import com.smarthire.tenant.auth.dto.UserResponse;
import com.smarthire.tenant.auth.mapper.AuthMapper;
import com.smarthire.tenant.cv.service.CvAccess;
import com.smarthire.tenant.job.dto.JobAssignmentModels.TransferOwnerRequest;
import com.smarthire.tenant.job.service.JobAssignmentService;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mapstruct.factory.Mappers;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TenantUserServiceTest {

    @Mock
    private UserRepository userRepository;
    @Spy
    private AuthMapper authMapper = Mappers.getMapper(AuthMapper.class);
    @Mock
    private TenantRoleService tenantRoleService;
    @Mock
    private JobRepository jobRepository;
    @Mock
    private JobAssignmentService jobAssignmentService;
    @Mock
    private CvAccess cvAccess;
    @Mock
    private RedisService redisService;

    @InjectMocks
    private TenantUserService tenantUserService;

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

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

    @Test
    void updateStatusRejectsSelfLock() {
        User admin = staff(1L, "TENANT_ADMIN");
        when(userRepository.findById(1L)).thenReturn(Optional.of(admin));
        when(cvAccess.actor()).thenReturn(admin);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> tenantUserService.updateStatus(1L, UpdateUserStatusRequest.builder().status(UserStatus.LOCKED).build()));
        assertEquals("CANNOT_LOCK_SELF", ex.getCode());
    }

    @Test
    void updateStatusRejectsLockingLastActiveTenantAdmin() {
        User actor = staff(1L, "ADMIN");
        User targetAdmin = staff(2L, "TENANT_ADMIN");
        when(userRepository.findById(2L)).thenReturn(Optional.of(targetAdmin));
        when(cvAccess.actor()).thenReturn(actor);
        when(userRepository.countByRoleAndStatus("TENANT_ADMIN", UserStatus.ACTIVE)).thenReturn(1L);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> tenantUserService.updateStatus(2L, UpdateUserStatusRequest.builder().status(UserStatus.LOCKED).build()));
        assertEquals("LAST_TENANT_ADMIN", ex.getCode());
    }

    @Test
    void updateStatusRequiresTransferWhenUserOwnsJobs() {
        User actor = staff(1L, "TENANT_ADMIN");
        User recruiter = staff(3L, "RECRUITER");
        Job owned = new Job();
        owned.setId(10L);
        owned.setTitle("Backend Engineer");

        when(userRepository.findById(3L)).thenReturn(Optional.of(recruiter));
        when(cvAccess.actor()).thenReturn(actor);
        when(jobRepository.findOwnedActiveJobsByUserId(eq(3L), any())).thenReturn(List.of(owned));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> tenantUserService.updateStatus(3L, UpdateUserStatusRequest.builder().status(UserStatus.LOCKED).build()));
        assertEquals("OWNER_TRANSFER_REQUIRED", ex.getCode());
    }

    @Test
    void updateStatusTransfersOwnedJobsAndLocksUser() {
        TenantContext.setCurrentTenant("acme");
        User actor = staff(1L, "TENANT_ADMIN");
        User recruiter = staff(3L, "RECRUITER");
        User recipient = staff(4L, "HR");
        Job owned = new Job();
        owned.setId(10L);

        when(userRepository.findById(3L)).thenReturn(Optional.of(recruiter));
        when(userRepository.findById(4L)).thenReturn(Optional.of(recipient));
        when(cvAccess.actor()).thenReturn(actor);
        when(jobRepository.findOwnedActiveJobsByUserId(eq(3L), any())).thenReturn(List.of(owned));
        when(userRepository.save(any(User.class))).thenAnswer(call -> call.getArgument(0));

        UserResponse res = tenantUserService.updateStatus(3L, UpdateUserStatusRequest.builder()
                .status(UserStatus.LOCKED)
                .transferToUserId(4L)
                .build());

        assertEquals("LOCKED", res.getStatus());
        assertEquals(UserStatus.LOCKED, recruiter.getStatus());
        verify(jobAssignmentService).transferOwnership(10L, new TransferOwnerRequest(4L));
        verify(redisService).deleteMatchingValues(eq("auth:tenant:refresh:*"), any());
    }

    @Test
    void updateStatusUnlocksLockedUser() {
        User locked = staff(3L, "RECRUITER");
        locked.setStatus(UserStatus.LOCKED);
        when(userRepository.findById(3L)).thenReturn(Optional.of(locked));
        when(userRepository.save(any(User.class))).thenAnswer(call -> call.getArgument(0));

        UserResponse res = tenantUserService.updateStatus(3L, UpdateUserStatusRequest.builder()
                .status(UserStatus.ACTIVE)
                .build());

        assertEquals("ACTIVE", res.getStatus());
        assertEquals(UserStatus.ACTIVE, locked.getStatus());
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
