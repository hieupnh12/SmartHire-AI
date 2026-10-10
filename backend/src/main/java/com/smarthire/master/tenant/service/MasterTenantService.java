package com.smarthire.master.tenant.service;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.master.entity.TenantInfo;
import com.smarthire.domain.master.repository.TenantInfoRepository;
import com.smarthire.master.notification.service.MasterNotificationService;
import com.smarthire.master.tenant.dto.OnboardTenantRequest;
import com.smarthire.master.tenant.dto.TenantAdminRequest;
import com.smarthire.master.tenant.dto.TenantResponse;
import com.smarthire.multitenancy.datasource.DynamicMultiTenantConnectionProvider;
import com.smarthire.multitenancy.service.TenantCredentialService;
import com.smarthire.multitenancy.service.TenantProvisioningService;
import com.smarthire.multitenancy.service.TenantPublicUrlService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import java.net.URI;
import java.security.SecureRandom;
import java.util.*;

@Service
public class MasterTenantService {
    public record ProvisionedWorkspace(TenantInfo tenant, String activationUrl) {}

    private static final Logger log = LoggerFactory.getLogger(MasterTenantService.class);
    private final TenantInfoRepository tenants;
    private final TenantProvisioningService provisioning;
    private final TenantCredentialService credentials;
    private final DynamicMultiTenantConnectionProvider pools;
    private final TenantPublicUrlService publicUrls;
    private final MasterNotificationService notificationService;
    private final org.springframework.transaction.support.TransactionTemplate registration;
    private final org.springframework.jdbc.core.JdbcTemplate masterJdbc;
    private final String mysqlBaseUrl;
    private final String mysqlOptions;
    private final String baseDomain;
    private final SecureRandom random = new SecureRandom();
    private static final Set<String> RESERVED = Set.of("www", "api", "admin", "master", "localhost", "smarthire-master");

    @Autowired
    public MasterTenantService(TenantInfoRepository tenants, TenantProvisioningService provisioning,
            TenantCredentialService credentials, DynamicMultiTenantConnectionProvider pools,
            TenantPublicUrlService publicUrls, MasterNotificationService notificationService,
            @Value("${app.tenant.mysql-base-url}") String mysqlBaseUrl,
            @Value("${app.tenant.mysql-options:sslMode=PREFERRED&allowPublicKeyRetrieval=true}") String mysqlOptions,
            @Value("${app.tenant.base-domain:smarthire.top}") String baseDomain,
            @org.springframework.beans.factory.annotation.Qualifier("masterTransactionManager") org.springframework.transaction.PlatformTransactionManager manager,
            @org.springframework.beans.factory.annotation.Qualifier("masterDataSource") javax.sql.DataSource masterDataSource) {
        this.registration = new org.springframework.transaction.support.TransactionTemplate(manager);
        this.masterJdbc = new org.springframework.jdbc.core.JdbcTemplate(masterDataSource);
        this.tenants = tenants;
        this.provisioning = provisioning;
        this.credentials = credentials;
        this.pools = pools;
        this.publicUrls = publicUrls;
        this.notificationService = notificationService;
        this.mysqlBaseUrl = mysqlBaseUrl;
        this.mysqlOptions = mysqlOptions != null ? mysqlOptions.replaceAll("^['\"]+|['\"]+$", "") : "";
        this.baseDomain = baseDomain;
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

    public void deleteTenant(Long id) {
        TenantInfo tenant = getTenantById(id);
        // Remove from connection pool
        pools.evict(tenant.getCode());
        
        try {
            // Drop database and user
            provisioning.deleteDatabaseAndUser(tenant);
        } catch (java.sql.SQLException ex) {
            throw new BusinessException("Failed to drop database: " + ex.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR, "DROP_DB_FAILED");
        }
        
        // Detach legal consent logs so immutable compliance audit trail survives tenant deletion, then cascade delete related records in Master DB
        masterJdbc.update("UPDATE master_consent_logs SET tenant_id = NULL, invoice_id = NULL WHERE tenant_id = ?", id);
        masterJdbc.update("DELETE FROM invoice_line_items WHERE invoice_id IN (SELECT id FROM invoices WHERE tenant_id = ?)", id);
        masterJdbc.update("DELETE FROM invoices WHERE tenant_id = ?", id);
        masterJdbc.update("DELETE FROM payment_transactions WHERE tenant_id = ?", id);
        masterJdbc.update("DELETE FROM contract_signatures WHERE contract_id IN (SELECT id FROM contracts WHERE tenant_id = ?)", id);
        masterJdbc.update("DELETE FROM contracts WHERE tenant_id = ?", id);
        masterJdbc.update("DELETE FROM tenant_subscriptions WHERE tenant_id = ?", id);
        masterJdbc.update("DELETE FROM tenant_usage_daily WHERE tenant_id = ?", id);
        
        // Delete from registry (cascade delete happens via JPA if configured, or just deletes TenantInfo)
        tenants.delete(tenant);
    }

    public TenantInfo updateTenant(Long id, com.smarthire.master.tenant.dto.UpdateTenantRequest request) {
        TenantInfo tenant = getTenantById(id);
        if (request.getCompanyName() != null) tenant.setName(request.getCompanyName());
        if (request.getIndustry() != null) tenant.setIndustry(request.getIndustry());
        if (request.getCompanySize() != null) tenant.setCompanySize(request.getCompanySize());
        if (request.getContactName() != null) tenant.setContactName(request.getContactName());
        if (request.getContactEmail() != null) tenant.setContactEmail(request.getContactEmail());
        if (request.getContactPhone() != null) tenant.setContactPhone(request.getContactPhone());
        if (request.getSubdomain() != null) tenant.setSubdomain(request.getSubdomain());
        if (request.getWebsite() != null) tenant.setWebsite(request.getWebsite());
        if (request.getAddress() != null) tenant.setAddress(request.getAddress());
        if (request.getTaxCode() != null) tenant.setTaxCode(request.getTaxCode());

        return tenants.save(tenant);
    }

    public TenantInfo onboardTenant(OnboardTenantRequest request) {
        return onboardTenantWithActivation(request).tenant();
    }

    public TenantResponse onboardTenantResponse(OnboardTenantRequest request) {
        ProvisionedWorkspace result = onboardTenantWithActivation(request);
        return TenantResponse.from(result.tenant(), result.activationUrl());
    }

    private ProvisionedWorkspace onboardTenantWithActivation(OnboardTenantRequest request) {
        TenantInfo tenant = registration.execute(status -> {
            masterJdbc.execute("SELECT pg_advisory_xact_lock(-1)");
            return registerTenant(request);
        });
        return provisionAndNotify(Objects.requireNonNull(tenant).getId(), request);
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
        tenant.setContactName(request.getAdminName());
        tenant.setContactEmail(request.getAdminEmail());
        tenant.setDbName(dbName);
        tenant.setDbUrl(url);
        tenant.setDbUsername(username);
        tenant.setDbPassword(credentials.encrypt(code, password));
        tenant.setManagedDatabase(managed);
        tenant.setCompanyLegalName(request.getCompanyLegalName());
        tenant.setTaxCode(request.getTaxCode());
        tenant.setBillingAddress(request.getBillingAddress());
        tenant.setBillingEmail(request.getBillingEmail() != null && !request.getBillingEmail().isBlank()
                ? request.getBillingEmail() : request.getAdminEmail());
        
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
        try {
            String planCode = (request.getPlanCode() != null && !request.getPlanCode().isBlank())
                    ? request.getPlanCode().trim().toUpperCase(Locale.ROOT)
                    : "STARTER";
            List<Long> planIds = masterJdbc.queryForList(
                    "SELECT id FROM subscription_plans WHERE UPPER(code) = ? LIMIT 1", Long.class, planCode);
            if (planIds.isEmpty() && !"STARTER".equals(planCode)) {
                planIds = masterJdbc.queryForList(
                        "SELECT id FROM subscription_plans WHERE UPPER(code) = 'STARTER' LIMIT 1", Long.class);
            }
            if (!planIds.isEmpty() && tenant.getId() != null) {
                masterJdbc.update(
                        "INSERT INTO tenant_subscriptions (tenant_id, plan_id, status, starts_at, ends_at, auto_renew, created_at, updated_at) " +
                        "VALUES (?, ?, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '1 year', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
                        tenant.getId(), planIds.get(0));
            }
        } catch (Exception ex) {
            log.debug("Could not auto-assign initial subscription for tenant {}: {}", code, ex.getMessage());
        }
        return tenant;
    }

    public TenantInfo retryProvisioning(Long id, TenantAdminRequest request) {
        getTenantById(id);
        return provisionAndNotify(id, request).tenant();
    }

    public TenantResponse retryProvisioningResponse(Long id, TenantAdminRequest request) {
        getTenantById(id);
        ProvisionedWorkspace result = provisionAndNotify(id, request);
        return TenantResponse.from(result.tenant(), result.activationUrl());
    }

    private ProvisionedWorkspace provisionAndNotify(Long id, TenantAdminRequest request) {
        TenantProvisioningService.ProvisionResult result = provisioning.provisionWithInvitation(id, request);
        TenantInfo tenant = result.tenant();
        String activationUrl = buildActivationUrl(tenant, result.activationToken());
        if (activationUrl != null && notificationService != null) {
            try {
                String workspaceUrl = "https://" + tenant.getSubdomain() + "." + baseDomain;
                notificationService.sendWorkspaceActivated(tenant, null, activationUrl, workspaceUrl);
            } catch (Exception ex) {
                log.warn("Could not dispatch workspace activation email for tenant {}: {}", tenant.getCode(), ex.getMessage());
            }
        }
        return new ProvisionedWorkspace(tenant, activationUrl);
    }

    private String buildActivationUrl(TenantInfo tenant, String activationToken) {
        if (activationToken == null || activationToken.isBlank()) {
            return null;
        }
        if (publicUrls != null) {
            return publicUrls.pathForTenant(tenant, "/invite/accept?token=" + activationToken);
        }
        String subdomain = (tenant.getSubdomain() == null || tenant.getSubdomain().isBlank())
                ? tenant.getCode()
                : tenant.getSubdomain();
        return "https://" + subdomain.toLowerCase(Locale.ROOT) + "." + baseDomain + "/invite/accept?token=" + activationToken;
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
        TenantAdminRequest adminRequest = new TenantAdminRequest();
        adminRequest.setAdminEmail(tenant.getContactEmail());
        adminRequest.setAdminName(tenant.getContactName());

        tenant.setStatus("PROVISIONING");
        tenants.saveAndFlush(tenant);

        TenantProvisioningService.ProvisionResult result = provisioning.provisionWithInvitation(tenant.getId(), adminRequest);
        return buildActivationUrl(result.tenant(), result.activationToken());
    }
}
