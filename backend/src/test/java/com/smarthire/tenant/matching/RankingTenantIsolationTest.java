package com.smarthire.tenant.matching;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.multitenancy.context.TenantContext;
import com.smarthire.multitenancy.interceptor.TenantWebInterceptor;
import org.junit.jupiter.api.*;
import org.springframework.mock.web.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import java.util.List;
import static org.assertj.core.api.Assertions.*;

class RankingTenantIsolationTest {
    private final com.smarthire.multitenancy.service.TenantRegistryService registry = org.mockito.Mockito.mock(com.smarthire.multitenancy.service.TenantRegistryService.class);
    private final TenantWebInterceptor interceptor = new TenantWebInterceptor(registry, "smarthire.top");
    @BeforeEach void login() {
        org.mockito.Mockito.when(registry.requireActive(org.mockito.ArgumentMatchers.anyString())).thenAnswer(invocation -> {
            var tenant = new com.smarthire.domain.master.entity.TenantInfo();
            tenant.setCode(invocation.getArgument(0)); return tenant;
        });
        org.mockito.Mockito.when(registry.requireActiveBySubdomain(org.mockito.ArgumentMatchers.anyString())).thenAnswer(invocation -> {
            var tenant = new com.smarthire.domain.master.entity.TenantInfo();
            tenant.setCode(invocation.getArgument(0)); return tenant;
        });
        var auth = new UsernamePasswordAuthenticationToken("recruiter", null, List.of());
        auth.setDetails("acme"); SecurityContextHolder.getContext().setAuthentication(auth);
        TenantContext.setCurrentTenant("acme");
    }
    @AfterEach void cleanup() { SecurityContextHolder.clearContext(); TenantContext.clear(); }
    @Test void rejectsHeaderOverrideOfJwtTenant() {
        var request = new MockHttpServletRequest(); request.addHeader("X-Tenant-ID", "other");
        assertThatThrownBy(() -> interceptor.preHandle(request, new MockHttpServletResponse(), new Object())).isInstanceOf(BusinessException.class);
        assertThat(TenantContext.getCurrentTenant()).isNull();
    }
    @Test void rejectsSubdomainOverrideOfJwtTenant() {
        var request = new MockHttpServletRequest(); request.setServerName("other.smarthire.top");
        assertThatThrownBy(() -> interceptor.preHandle(request, new MockHttpServletResponse(), new Object())).isInstanceOf(BusinessException.class);
    }
    @Test void usesAuthenticatedTenantAndClearsAfterRequest() {
        var request = new MockHttpServletRequest(); var response = new MockHttpServletResponse(); var handler = new Object();
        assertThat(interceptor.preHandle(request, response, handler)).isTrue();
        assertThat(TenantContext.getCurrentTenant()).isEqualTo("acme");
        interceptor.afterCompletion(request, response, handler, null);
        assertThat(TenantContext.getCurrentTenant()).isNull();
    }
}
