package com.smarthire.multitenancy.interceptor;

import com.smarthire.multitenancy.context.TenantContext;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class TenantWebInterceptor implements HandlerInterceptor {

    public static final String TENANT_HEADER = "X-Tenant-ID";

    @Override
    public boolean preHandle(@NonNull HttpServletRequest request, @NonNull HttpServletResponse response, @NonNull Object handler) {
        String tenantId = request.getHeader(TENANT_HEADER);

        if (tenantId == null || tenantId.isBlank()) {
            String serverName = request.getServerName(); // e.g. acme.smarthire.ai
            if (serverName != null && serverName.contains(".")) {
                String subdomain = serverName.split("\\.")[0];
                if (!"www".equalsIgnoreCase(subdomain) && !"api".equalsIgnoreCase(subdomain) && !"localhost".equalsIgnoreCase(subdomain)) {
                    tenantId = subdomain;
                }
            }
        }

        if (tenantId != null && !tenantId.isBlank()) {
            TenantContext.setCurrentTenant(tenantId);
        }

        return true;
    }

    @Override
    public void afterCompletion(@NonNull HttpServletRequest request, @NonNull HttpServletResponse response, @NonNull Object handler, Exception ex) {
        TenantContext.clear();
    }
}
