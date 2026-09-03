package com.smarthire.master.tenant.service;

import com.smarthire.domain.master.entity.TenantInfo;
import com.smarthire.domain.master.repository.TenantInfoRepository;
import com.smarthire.master.tenant.dto.OnboardTenantRequest;
import com.smarthire.multitenancy.service.TenantProvisioningService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class MasterTenantService {

    private final TenantInfoRepository tenantInfoRepository;
    private final TenantProvisioningService tenantProvisioningService;

    public MasterTenantService(TenantInfoRepository tenantInfoRepository,
                               TenantProvisioningService tenantProvisioningService) {
        this.tenantInfoRepository = tenantInfoRepository;
        this.tenantProvisioningService = tenantProvisioningService;
    }

    public List<TenantInfo> getAllTenants() {
        return tenantInfoRepository.findAll();
    }

    public TenantInfo getTenantById(Long id) {
        return tenantInfoRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Tenant with ID " + id + " not found."));
    }

    public boolean checkTenantExists(String codeOrSubdomain) {
        if (codeOrSubdomain == null || codeOrSubdomain.isBlank()) return false;
        String clean = codeOrSubdomain.trim().toLowerCase();
        if ("acme".equalsIgnoreCase(clean)) return true;
        return tenantInfoRepository.existsByCode(clean) || tenantInfoRepository.existsBySubdomain(clean);
    }

    @Transactional
    public TenantInfo updateTenantStatus(Long id, String status) {
        TenantInfo tenant = getTenantById(id);
        tenant.setStatus(status.toUpperCase());
        return tenantInfoRepository.save(tenant);
    }

    @Transactional
    public TenantInfo onboardTenant(OnboardTenantRequest request) {
        if (tenantInfoRepository.existsByCode(request.getCode())) {
            throw new IllegalArgumentException("Tenant with code '" + request.getCode() + "' already exists.");
        }
        if (tenantInfoRepository.existsBySubdomain(request.getSubdomain())) {
            throw new IllegalArgumentException("Subdomain '" + request.getSubdomain() + "' is already in use.");
        }

        String dbName = "smarthire_tenant_" + request.getCode().toLowerCase();

        TenantInfo tenant = new TenantInfo();
        tenant.setCode(request.getCode().toLowerCase());
        tenant.setName(request.getName());
        tenant.setSubdomain(request.getSubdomain().toLowerCase());
        tenant.setDbName(dbName);
        tenant.setDbUrl(request.getCustomDbUrl());
        tenant.setDbUsername(request.getDbUsername());
        tenant.setDbPassword(request.getDbPassword());
        tenant.setStatus("ACTIVE");

        TenantInfo savedTenant = tenantInfoRepository.save(tenant);

        // Provision & Run Flyway on the new Tenant DB
        tenantProvisioningService.initAndMigrateTenantDb(
                savedTenant.getCode(),
                dbName,
                savedTenant.getDbUrl(),
                savedTenant.getDbUsername(),
                savedTenant.getDbPassword()
        );

        return savedTenant;
    }
}
