package com.smarthire.tenant.cv.service;

import com.smarthire.domain.tenant.repository.UserRepository;
import com.smarthire.multitenancy.context.TenantContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

@ExtendWith(MockitoExtension.class)
class CvAccessTest {

    @Mock
    private UserRepository users;

    @AfterEach
    void clear() {
        SecurityContextHolder.clearContext();
        TenantContext.clear();
    }

    @Test
    void customRecruiterRoleIsStaff() {
        authenticate("se36", "ROLE_CV_SCREENING", "ROLE_STAFF");
        assertTrue(new CvAccess(users).staff());
    }

    @Test
    void builtInRecruiterIsStaff() {
        authenticate("se36", "ROLE_RECRUITER", "ROLE_STAFF");
        assertTrue(new CvAccess(users).staff());
    }

    @Test
    void candidateIsNotStaff() {
        authenticate("se36", "ROLE_CANDIDATE");
        assertFalse(new CvAccess(users).staff());
    }

    private static void authenticate(String tenant, String... roles) {
        TenantContext.setCurrentTenant(tenant);
        UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                "recruiter@se36.com",
                null,
                java.util.Arrays.stream(roles).map(SimpleGrantedAuthority::new).toList());
        authentication.setDetails(tenant);
        SecurityContextHolder.getContext().setAuthentication(authentication);
    }
}
