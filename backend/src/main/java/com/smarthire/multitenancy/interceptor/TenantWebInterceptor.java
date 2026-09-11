package com.smarthire.multitenancy.interceptor;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.multitenancy.context.TenantContext;
import com.smarthire.multitenancy.service.TenantRegistryService;
import jakarta.servlet.http.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.lang.NonNull;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;
import java.util.Locale;

@Component
public class TenantWebInterceptor implements HandlerInterceptor {
    public static final String TENANT_HEADER = "X-Tenant-ID";
    private final TenantRegistryService registry;
    private final String baseDomain;

    public TenantWebInterceptor(TenantRegistryService registry,
            @Value("${app.tenant.base-domain:smarthire.ai}") String baseDomain) {
        this.registry = registry;
        this.baseDomain = baseDomain.toLowerCase(Locale.ROOT);
    }

    @Override
    public boolean preHandle(@NonNull HttpServletRequest request, @NonNull HttpServletResponse response,
                             @NonNull Object handler) {
        TenantContext.clear();
        String header = request.getHeader(TENANT_HEADER);
        String headerCode = header == null || header.isBlank() ? null : registry.requireActive(header).getCode();
        String host = request.getServerName().toLowerCase(Locale.ROOT);
        String subdomain = null;
        for (String suffix : new String[]{"." + baseDomain, ".localhost"}) {
            if (host.endsWith(suffix)) {
                String label = host.substring(0, host.length() - suffix.length());
                if (!label.contains(".") && !java.util.Set.of("www", "api", "admin").contains(label)) subdomain = label;
                break;
            }
        }
        String hostCode = subdomain == null ? null : registry.requireActive(subdomain).getCode();
        if (headerCode != null && hostCode != null && !headerCode.equals(hostCode)) throw mismatch();
        String requested = headerCode != null ? headerCode : hostCode;
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && auth.getDetails() instanceof String tokenTenant
                && !tokenTenant.isBlank()) {
            String authenticated = registry.requireActive(tokenTenant).getCode();
            if (requested != null && !authenticated.equals(requested)) throw mismatch();
            requested = authenticated;
        }
        if (requested == null) throw new BusinessException("Tenant is required", HttpStatus.BAD_REQUEST, "TENANT_REQUIRED");
        TenantContext.setCurrentTenant(requested);
        return true;
    }

    private BusinessException mismatch() {
        return new BusinessException("Tenant does not match authenticated session",
                HttpStatus.FORBIDDEN, "TENANT_MISMATCH");
    }

    @Override
    public void afterCompletion(@NonNull HttpServletRequest request, @NonNull HttpServletResponse response,
                                @NonNull Object handler, Exception ex) {
        TenantContext.clear();
    }
}
