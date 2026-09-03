package com.smarthire.multitenancy.resolver;

import com.smarthire.multitenancy.context.TenantContext;
import org.hibernate.context.spi.CurrentTenantIdentifierResolver;
import org.springframework.stereotype.Component;

@Component
public class CurrentTenantIdentifierResolverImpl implements CurrentTenantIdentifierResolver<String> {

    public static final String DEFAULT_TENANT = "smarthire_master";

    @Override
    public String resolveCurrentTenantIdentifier() {
        String tenantId = TenantContext.getCurrentTenant();
        return (tenantId != null && !tenantId.isBlank()) ? tenantId : DEFAULT_TENANT;
    }

    @Override
    public boolean validateExistingCurrentSessions() {
        return true;
    }
}
