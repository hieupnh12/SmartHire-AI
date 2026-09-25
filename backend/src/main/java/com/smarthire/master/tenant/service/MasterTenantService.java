package com.smarthire.master.tenant.service;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.master.entity.TenantInfo;
import com.smarthire.domain.master.repository.TenantInfoRepository;
import com.smarthire.master.tenant.dto.OnboardTenantRequest;
import com.smarthire.master.tenant.dto.TenantAdminRequest;
import com.smarthire.multitenancy.datasource.DynamicMultiTenantConnectionProvider;
import com.smarthire.multitenancy.service.TenantCredentialService;
import com.smarthire.multitenancy.service.TenantProvisioningService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import java.net.URI;
import java.security.SecureRandom;
import java.util.*;

@Service
public class MasterTenantService {
    private final TenantInfoRepository tenants;
    private final TenantProvisioningService provisioning;
    private final TenantCredentialService credentials;
    private final DynamicMultiTenantConnectionProvider pools;
    private final org.springframework.transaction.support.TransactionTemplate registration;
    private final org.springframework.jdbc.core.JdbcTemplate masterJdbc;
    private final String mysqlBaseUrl;
    private final String mysqlOptions;
    private final SecureRandom random = new SecureRandom();
    private static final Set<String> RESERVED = Set.of("www", "api", "admin", "master", "localhost", "smarthire-master");

    public MasterTenantService(TenantInfoRepository tenants, TenantProvisioningService provisioning,
            TenantCredentialService credentials, DynamicMultiTenantConnectionProvider pools,
            @Value("${app.tenant.mysql-base-url}") String mysqlBaseUrl,
            @Value("${app.tenant.mysql-options:sslMode=PREFERRED&allowPublicKeyRetrieval=true}") String mysqlOptions,
            @org.springframework.beans.factory.annotation.Qualifier("masterTransactionManager") org.springframework.transaction.PlatformTransactionManager manager,
            @org.springframework.beans.factory.annotation.Qualifier("masterDataSource") javax.sql.DataSource masterDataSource) {
        this.registration = new org.springframework.transaction.support.TransactionTemplate(manager);
        this.masterJdbc = new org.springframework.jdbc.core.JdbcTemplate(masterDataSource);
        this.tenants = tenants;
        this.provisioning = provisioning;
        this.credentials = credentials;
        this.pools = pools;
        this.mysqlBaseUrl = mysqlBaseUrl;
        this.mysqlOptions = mysqlOptions != null ? mysqlOptions.replaceAll("^['\"]+|['\"]+$", "") : "";
    }

    public List<TenantInfo> getAllTenants() { return tenants.findAll(); }

    public TenantInfo getTenantById(Long id) {
        return tenants.findById(id).orElseThrow(() ->
                new BusinessException("Tenant not found", HttpStatus.NOT_FOUND, "TENANT_NOT_FOUND"));
    }

    public boolean checkSubdomainExists(String subdomain) {
        if (subdomain == null || subdomain.isBlank()) return false;
        String value = subdomain.trim().toLowerCase(Locale.ROOT);
        return tenants.findBySubdomain(value)
                .filter(t -> "ACTIVE".equals(t.getStatus())).isPresent();
    }

    public TenantInfo updateTenantStatus(Long id, String status) {
        if (!Set.of("ACTIVE", "SUSPENDED").contains(status)) {
            throw new BusinessException("Status must be ACTIVE or SUSPENDED", HttpStatus.BAD_REQUEST, "INVALID_STATUS");
        }
        // Conditional update prevents status changes racing with provisioning or another administrator.
        if (tenants.changeOperationalStatus(id, status) != 1) {
            throw new BusinessException("Tenant must be ACTIVE or SUSPENDED",
                    HttpStatus.CONFLICT, "INVALID_TENANT_STATE");
        }
        TenantInfo tenant = getTenantById(id);
        pools.evict(tenant.getCode());
        return tenant;
    }

    public TenantInfo onboardTenant(OnboardTenantRequest request) {
        TenantInfo tenant = registration.execute(status -> {
            masterJdbc.execute("SELECT pg_advisory_xact_lock(-1)");
            return registerTenant(request);
        });
        return provisioning.provision(Objects.requireNonNull(tenant).getId(), request);
    }

    private TenantInfo registerTenant(OnboardTenantRequest request) {
        String code = request.getCode();
        String subdomain = request.getSubdomain();
        if (RESERVED.contains(code) || RESERVED.contains(subdomain)
                || tenants.existsByCode(code) || tenants.existsBySubdomain(code)
                || tenants.existsByCode(subdomain) || tenants.existsBySubdomain(subdomain)) {
            throw new BusinessException("Tenant code or subdomain is unavailable", HttpStatus.CONFLICT, "TENANT_EXISTS");
        }
        String dbName = "smarthire_tenant_" + code.replace('-', '_');
        boolean managed = request.getCustomDbUrl() == null || request.getCustomDbUrl().isBlank();
        if (managed && (request.getDbUsername() != null || request.getDbPassword() != null)) {
            throw new BusinessException("Custom credentials require a custom MySQL URL",
                    HttpStatus.BAD_REQUEST, "INVALID_DATABASE_CONFIG");
        }
        String url = managed ? mysqlBaseUrl + "/" + dbName + (mysqlOptions.isBlank() ? "" : "?" + mysqlOptions) : request.getCustomDbUrl();
        validateUrl(url, dbName);
        String username = managed ? "sh_" + UUID.randomUUID().toString().replace("-", "").substring(0, 24)
                : request.getDbUsername();
        String password = managed ? randomPassword() : request.getDbPassword();
        if (username == null || username.isBlank() || password == null || password.isBlank()) {
            throw new BusinessException("Database username and password are required",
                    HttpStatus.BAD_REQUEST, "INVALID_DATABASE_CONFIG");
        }
        TenantInfo tenant = new TenantInfo();
        tenant.setCode(code);
        tenant.setName(request.getName());
        tenant.setSubdomain(subdomain);
        tenant.setDbName(dbName);
        tenant.setDbUrl(url);
        tenant.setDbUsername(username);
        tenant.setDbPassword(credentials.encrypt(code, password));
        tenant.setManagedDatabase(managed);
        String envType = (request.getEnvironmentType() != null && !request.getEnvironmentType().isBlank())
                ? request.getEnvironmentType().toUpperCase() : "PRODUCTION";
        tenant.setEnvironmentType(envType);
        tenant.setStatus("PROVISIONING");
        try {
            tenant = tenants.saveAndFlush(tenant);
        } catch (DataIntegrityViolationException ex) {
            throw new BusinessException("Tenant code, subdomain or database is already registered",
                    HttpStatus.CONFLICT, "TENANT_EXISTS");
        }
        return tenant;
    }

    public TenantInfo retryProvisioning(Long id, TenantAdminRequest request) {
        getTenantById(id);
        return provisioning.provision(id, request);
    }

    private String randomPassword() {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private void validateUrl(String url, String dbName) {
        try {
            if (!url.startsWith("jdbc:mysql://")) throw new IllegalArgumentException("Not starting with jdbc:mysql://");
            URI uri = URI.create(url.substring(5));
            if (uri.getHost() == null || uri.getUserInfo() != null || uri.getFragment() != null
                    || !("/" + dbName).equals(uri.getPath())) throw new IllegalArgumentException("Host/path mismatch: " + uri.getPath());
            // Only transport settings are accepted; disallow driver/plugin and local-file options.
            if (uri.getQuery() != null) {
                for (String option : uri.getQuery().split("&")) {
                    if (!option.matches("(sslMode=(DISABLED|PREFERRED|REQUIRED|VERIFY_CA|VERIFY_IDENTITY)|allowPublicKeyRetrieval=(true|false)|serverTimezone=UTC|createDatabaseIfNotExist=(true|false))")) {
                        throw new IllegalArgumentException("Invalid option: " + option);
                    }
                }
            }
        } catch (IllegalArgumentException ex) {
            throw new BusinessException("Expected a MySQL URL for database " + dbName + ". " + ex.getMessage(),
                    HttpStatus.BAD_REQUEST, "INVALID_DATABASE_URL");
        }
    }

    public TenantInfo registerPendingTenant(String code, String name, String subdomain,
                                            String contactName, String contactEmail, String contactPhone,
                                            String taxCode, String companyLegalName, String billingAddress) {
        String normalizedCode = code.trim().toLowerCase(Locale.ROOT);
        String normalizedSubdomain = subdomain.trim().toLowerCase(Locale.ROOT);
        if (RESERVED.contains(normalizedCode) || RESERVED.contains(normalizedSubdomain)
                || tenants.existsByCode(normalizedCode) || tenants.existsBySubdomain(normalizedCode)
                || tenants.existsByCode(normalizedSubdomain) || tenants.existsBySubdomain(normalizedSubdomain)) {
            throw new BusinessException("Tenant code hoặc subdomain đã tồn tại hoặc không khả dụng", HttpStatus.CONFLICT, "TENANT_EXISTS");
        }
        String dbName = "smarthire_tenant_" + normalizedCode.replace('-', '_');
        String url = mysqlBaseUrl + "/" + dbName + (mysqlOptions.isBlank() ? "" : "?" + mysqlOptions);
        validateUrl(url, dbName);
        String username = "sh_" + UUID.randomUUID().toString().replace("-", "").substring(0, 24);
        String password = randomPassword();

        TenantInfo tenant = new TenantInfo();
        tenant.setCode(normalizedCode);
        tenant.setName(name.trim());
        tenant.setSubdomain(normalizedSubdomain);
        tenant.setContactName(contactName);
        tenant.setContactEmail(contactEmail);
        tenant.setContactPhone(contactPhone);
        tenant.setBillingEmail(contactEmail);
        tenant.setTaxCode(taxCode);
        tenant.setCompanyLegalName(companyLegalName);
        tenant.setBillingAddress(billingAddress);
        tenant.setDbName(dbName);
        tenant.setDbUrl(url);
        tenant.setDbUsername(username);
        tenant.setDbPassword(credentials.encrypt(normalizedCode, password));
        tenant.setManagedDatabase(true);
        tenant.setEnvironmentType("PRODUCTION");
        tenant.setStatus("PENDING_PAYMENT");
        try {
            return tenants.saveAndFlush(tenant);
        } catch (DataIntegrityViolationException ex) {
            throw new BusinessException("Tenant code hoặc subdomain đã được đăng ký", HttpStatus.CONFLICT, "TENANT_EXISTS");
        }
    }

    public String provisionPendingTenant(Long id) {
        TenantInfo tenant = getTenantById(id);
        if (!"PENDING_PAYMENT".equals(tenant.getStatus()) && !"FAILED".equals(tenant.getStatus())) {
            throw new BusinessException("Chỉ doanh nghiệp ở trạng thái PENDING_PAYMENT mới được kích hoạt", HttpStatus.CONFLICT, "INVALID_TENANT_STATE");
        }
        String tempPassword = "Sh!" + UUID.randomUUID().toString().replace("-", "").substring(0, 13);
        TenantAdminRequest adminRequest = new TenantAdminRequest();
        adminRequest.setAdminEmail(tenant.getContactEmail());
        adminRequest.setAdminName(tenant.getContactName());
        adminRequest.setAdminPassword(tempPassword);

        tenant.setStatus("PROVISIONING");
        tenants.saveAndFlush(tenant);

        provisioning.provision(tenant.getId(), adminRequest);
        return tempPassword;
    }
}
