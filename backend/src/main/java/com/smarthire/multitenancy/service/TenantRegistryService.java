package com.smarthire.multitenancy.service;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.master.entity.TenantInfo;
import com.smarthire.domain.master.repository.TenantInfoRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Locale;

@Service
public class TenantRegistryService {
    private final TenantInfoRepository repository;
    public TenantRegistryService(TenantInfoRepository repository) { this.repository = repository; }

    @Transactional(transactionManager = "masterTransactionManager", readOnly = true)
    public TenantInfo requireActive(String identifier) {
        if (identifier == null || identifier.isBlank() || "smarthire_master".equalsIgnoreCase(identifier)
                || com.smarthire.multitenancy.resolver.CurrentTenantIdentifierResolverImpl.UNRESOLVED.equals(identifier)) {
            throw new BusinessException("Tenant is required", HttpStatus.BAD_REQUEST, "TENANT_REQUIRED");
        }
        String normalized = identifier.trim().toLowerCase(Locale.ROOT);
        TenantInfo tenant = repository.findByCode(normalized)
                .or(() -> repository.findBySubdomain(normalized))
                .orElseThrow(() -> new BusinessException("Tenant not found", HttpStatus.NOT_FOUND, "TENANT_NOT_FOUND"));
        if (!"ACTIVE".equals(tenant.getStatus())) {
            throw new BusinessException("Tenant is not active", HttpStatus.FORBIDDEN, "TENANT_INACTIVE");
        }
        return tenant;
    }

    @Transactional(transactionManager = "masterTransactionManager", readOnly = true)
    public TenantInfo requireActiveBySubdomain(String subdomain) {
        if (subdomain == null || subdomain.isBlank()) {
            throw new BusinessException("Tenant is required", HttpStatus.BAD_REQUEST, "TENANT_REQUIRED");
        }
        String normalized = subdomain.trim().toLowerCase(Locale.ROOT);
        TenantInfo tenant = repository.findBySubdomain(normalized)
                .orElseThrow(() -> new BusinessException("Tenant subdomain not found", HttpStatus.NOT_FOUND,
                        "TENANT_NOT_FOUND"));
        if (!"ACTIVE".equals(tenant.getStatus())) {
            throw new BusinessException("Tenant is not active", HttpStatus.FORBIDDEN, "TENANT_INACTIVE");
        }
        return tenant;
    }
}
