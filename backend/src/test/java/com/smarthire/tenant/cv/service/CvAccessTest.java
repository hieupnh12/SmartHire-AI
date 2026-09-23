package com.smarthire.tenant.cv.service;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.enums.UserStatus;
import com.smarthire.domain.tenant.entity.Job;
import com.smarthire.domain.tenant.entity.User;
import com.smarthire.domain.tenant.repository.JobAssignmentRepository;
import com.smarthire.domain.tenant.repository.UserRepository;
import com.smarthire.multitenancy.context.TenantContext;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CvAccessTest {
    @Mock UserRepository users;
    @Mock JobAssignmentRepository assignments;

    CvAccess access;
    User recruiter;
    Job job;

    @BeforeEach
    void setUp() {
        access = new CvAccess(users, assignments);
        TenantContext.setCurrentTenant("acme");
        recruiter = new User();
        recruiter.setId(2L);
        recruiter.setEmail("recruiter@acme.test");
        recruiter.setFullName("Lan");
        recruiter.setRole("RECRUITER");
        recruiter.setStatus(UserStatus.ACTIVE);
        job = new Job();
        job.setId(9L);
        job.setTitle("Backend");
        login("recruiter@acme.test", "ROLE_RECRUITER");
    }

    @AfterEach
    void cleanup() {
        TenantContext.clear();
        SecurityContextHolder.clearContext();
    }

    @Test
    void requireJobAllowsAssignedRecruiter() {
        when(users.findByEmailIgnoreCase("recruiter@acme.test")).thenReturn(Optional.of(recruiter));
        when(assignments.existsByJob_IdAndUser_Id(9L, 2L)).thenReturn(true);
        access.requireJob(job);
    }

    @Test
    void requireJobRejectsUnassignedRecruiter() {
        when(users.findByEmailIgnoreCase("recruiter@acme.test")).thenReturn(Optional.of(recruiter));
        when(assignments.existsByJob_IdAndUser_Id(9L, 2L)).thenReturn(false);
        BusinessException ex = assertThrows(BusinessException.class, () -> access.requireJob(job));
        assertEquals("JOB_NOT_ASSIGNED", ex.getCode());
    }

    @Test
    void requireJobAllowsAdminWithoutAssignment() {
        User admin = new User();
        admin.setId(1L);
        admin.setEmail("admin@acme.test");
        admin.setFullName("Admin");
        admin.setRole("TENANT_ADMIN");
        login("admin@acme.test", "ROLE_TENANT_ADMIN");
        when(users.findByEmailIgnoreCase("admin@acme.test")).thenReturn(Optional.of(admin));
        access.requireJob(job);
    }

    @Test
    void staffIncludesCustomRoleAuthority() {
        login("recruiter@acme.test", "ROLE_STAFF", "ROLE_CV_SCREENING");
        when(users.findByEmailIgnoreCase("recruiter@acme.test")).thenReturn(Optional.of(recruiter));
        when(assignments.existsByJob_IdAndUser_Id(9L, 2L)).thenReturn(true);
        access.requireJob(job);
    }

    private static void login(String email, String... roles) {
        var auth = new UsernamePasswordAuthenticationToken(
                email, null, java.util.Arrays.stream(roles).map(SimpleGrantedAuthority::new).toList());
        auth.setDetails("acme");
        SecurityContextHolder.getContext().setAuthentication(auth);
    }
}
