package com.smarthire.tenant.company.service;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.master.entity.TenantInfo;
import com.smarthire.domain.master.repository.TenantInfoRepository;
import com.smarthire.multitenancy.context.TenantContext;
import com.smarthire.tenant.company.dto.CompanyProfileResponse;
import com.smarthire.tenant.company.dto.UpdateCompanyProfileRequest;
import com.smarthire.tenant.company.mapper.CompanyProfileMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

@Slf4j
@Service
@RequiredArgsConstructor
public class CompanyProfileServiceImpl implements CompanyProfileService {

    private final TenantInfoRepository tenantInfoRepository;
    private final CompanyProfileMapper companyProfileMapper;

    @Override
    @Transactional(transactionManager = "masterTransactionManager", readOnly = true)
    public CompanyProfileResponse getProfile() {
        return companyProfileMapper.toCompanyProfileResponse(currentTenant());
    }

    @Override
    @Transactional(transactionManager = "masterTransactionManager")
    public CompanyProfileResponse updateProfile(UpdateCompanyProfileRequest request) {
        TenantInfo tenant = currentTenant();
        companyProfileMapper.updateEntity(request, tenant);
        TenantInfo saved = tenantInfoRepository.save(tenant);
        log.info("Company profile updated for tenant '{}'", saved.getCode());
        return companyProfileMapper.toCompanyProfileResponse(saved);
    }

    // Branding metadata lives in the Master DB, so the row is resolved from the request tenant context.
    private TenantInfo currentTenant() {
        String identifier = TenantContext.getCurrentTenant();
        if (identifier == null || identifier.isBlank()) {
            throw new BusinessException("Tenant context is required for this request",
                    HttpStatus.BAD_REQUEST, "TENANT_REQUIRED");
        }
        String normalized = identifier.trim().toLowerCase(Locale.ROOT);
        return tenantInfoRepository.findByCode(normalized)
                .or(() -> tenantInfoRepository.findBySubdomain(normalized))
                .orElseThrow(() -> new BusinessException("Company profile not found for tenant '" + normalized + "'",
                        HttpStatus.NOT_FOUND, "TENANT_NOT_FOUND"));
    }
}
