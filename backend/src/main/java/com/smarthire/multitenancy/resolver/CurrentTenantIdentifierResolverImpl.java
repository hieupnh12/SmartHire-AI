package com.smarthire.multitenancy.resolver;

import com.smarthire.multitenancy.context.TenantContext;
import org.hibernate.context.spi.CurrentTenantIdentifierResolver;
import org.springframework.stereotype.Component;

@Component
public class CurrentTenantIdentifierResolverImpl implements CurrentTenantIdentifierResolver<String> {
    public static final String UNRESOLVED = "__no_tenant__";
    @Override
    public String resolveCurrentTenantIdentifier() {
        String tenant = TenantContext.getCurrentTenant();
        if (tenant == null || tenant.isBlank() || "smarthire_master".equals(tenant)) {
            // Spring Data opens metadata-only sessions while building repositories at startup.
            // This sentinel has no datasource; the registry rejects it before any JDBC access.
            return UNRESOLVED;
        }
        return tenant;
    }
    @Override
    public boolean validateExistingCurrentSessions() { return true; }
}
