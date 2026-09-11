package com.smarthire.multitenancy;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.master.entity.*;
import com.smarthire.domain.master.repository.*;
import com.smarthire.domain.tenant.repository.UserRepository;
import com.smarthire.master.tenant.dto.OnboardTenantRequest;
import com.smarthire.master.tenant.service.MasterTenantService;
import com.smarthire.multitenancy.context.TenantContext;
import com.smarthire.multitenancy.datasource.DynamicMultiTenantConnectionProvider;
import com.smarthire.multitenancy.service.TenantCredentialService;
import com.smarthire.security.JwtTokenProvider;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.*;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.*;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.*;
import javax.sql.DataSource;
import java.sql.*;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {
        "spring.rabbitmq.listener.simple.auto-startup=false",
        "management.health.redis.enabled=false", "management.health.rabbit.enabled=false",
        "app.bootstrap.admin-enabled=false", "logging.level.com.smarthire=INFO"
})
@AutoConfigureMockMvc
@Testcontainers
class MultiDatabaseIntegrationTest {
    private static final String PROVISION_PASSWORD = "a".repeat(48);
    @Container static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");
    @Container static MySQLContainer<?> mysql = new MySQLContainer<>("mysql:8.4")
            .withDatabaseName("bootstrap").withUsername("test").withPassword("integration-password")
            .withEnv("TENANT_PROVISIONING_PASSWORD", PROVISION_PASSWORD)
            .withCopyFileToContainer(org.testcontainers.utility.MountableFile.forHostPath(
                    java.nio.file.Path.of("..", "deploy", "mysql", "init-provisioner.sh").toAbsolutePath()),
                    "/docker-entrypoint-initdb.d/init-provisioner.sh");
    private static final String ADMIN_PASSWORD = "IntegrationAdmin-123!";

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) throws Exception {
        registry.add("app.datasource.master.url", postgres::getJdbcUrl);
        registry.add("app.datasource.master.username", postgres::getUsername);
        registry.add("app.datasource.master.password", postgres::getPassword);
        registry.add("app.tenant.mysql-base-url", () -> "jdbc:mysql://" + mysql.getHost() + ":" + mysql.getMappedPort(3306));
        registry.add("app.tenant.provisioning.url", () -> "jdbc:mysql://" + mysql.getHost() + ":" + mysql.getMappedPort(3306) + "/?allowPublicKeyRetrieval=true");
        registry.add("app.tenant.provisioning.username", () -> "smarthire_provisioner");
        registry.add("app.tenant.provisioning.password", () -> PROVISION_PASSWORD);
        registry.add("app.tenant.credentials-key", () -> Base64.getEncoder().encodeToString(new byte[32]));
        registry.add("smarthire.jwt.secret", () -> "integration-jwt-secret-".repeat(3));
        registry.add("app.jwt.secret", () -> "integration-jwt-secret-".repeat(3));
    }

    @Autowired MasterTenantService service;
    @Autowired TenantInfoRepository tenants;
    @Autowired UserRepository users;
    @Autowired PlatformUserRepository platformUsers;
    @Autowired DynamicMultiTenantConnectionProvider provider;
    @Autowired TenantCredentialService credentials;
    @Autowired JwtTokenProvider tokens;
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired @Qualifier("masterDataSource") DataSource master;

    @AfterEach void cleanup() { TenantContext.clear(); }

    private OnboardTenantRequest request(String prefix) {
        String code = prefix + UUID.randomUUID().toString().substring(0, 8);
        var request = new OnboardTenantRequest();
        request.setCode(code); request.setSubdomain("site-" + code); request.setName("Integration tenant");
        request.setAdminName("Tenant Admin"); request.setAdminEmail("admin@example.test"); request.setAdminPassword(ADMIN_PASSWORD);
        return request;
    }

    private String platformToken() {
        PlatformUser user = new PlatformUser(); user.setEmail("platform@example.test"); user.setFullName("Platform");
        user.setPasswordHash("unused"); user = platformUsers.findByEmailIgnoreCase(user.getEmail()).orElseGet(() -> platformUsers.save(userForPlatform()));
        return tokens.generatePlatformToken(user);
    }

    private PlatformUser userForPlatform() {
        PlatformUser user = new PlatformUser(); user.setEmail("platform@example.test");
        user.setFullName("Platform"); user.setPasswordHash("unused"); return user;
    }

    @Test void masterAndTwoTenantsUseSeparateDatabasesAndRestrictedUsers() throws Exception {
        TenantInfo alpha = service.onboardTenant(request("alpha"));
        TenantInfo beta = service.onboardTenant(request("beta"));
        assertThat(alpha.getStatus()).isEqualTo("ACTIVE");
        assertThat(alpha.getDbPassword()).startsWith("v1:").doesNotContain(ADMIN_PASSWORD);
        assertThat(alpha.getDbUsername()).isNotEqualTo(beta.getDbUsername()).isNotEqualTo("smarthire_provisioner");
        for (TenantInfo tenant : List.of(alpha, beta)) {
            TenantContext.setCurrentTenant(tenant.getCode());
            assertThat(users.findAll()).hasSize(1);
            assertThat(tenants.findByCode(alpha.getCode())).isPresent();
            try (Connection connection = provider.getConnection(tenant.getCode());
                 Statement sql = connection.createStatement()) {
                try (ResultSet rows = sql.executeQuery("SELECT DATABASE()")) {
                    rows.next(); assertThat(rows.getString(1)).isEqualTo(tenant.getDbName());
                }
                assertThatThrownBy(() -> sql.executeQuery("SELECT * FROM `" + (tenant == alpha ? beta : alpha).getDbName() + "`.users"))
                        .isInstanceOf(SQLException.class);
                assertThatThrownBy(() -> sql.execute("CREATE USER 'forbidden'@'%' IDENTIFIED BY 'forbidden-password'"))
                        .isInstanceOf(SQLException.class);
                assertThatThrownBy(() -> sql.executeQuery("SELECT * FROM tenants")).isInstanceOf(SQLException.class);
            }
        }
        TenantContext.setCurrentTenant(alpha.getCode());
        var markerUser = new com.smarthire.domain.tenant.entity.User();
        markerUser.setEmail("alpha-only@example.test"); markerUser.setFullName("Alpha only");
        markerUser.setRole(com.smarthire.domain.enums.UserRole.CANDIDATE);
        users.saveAndFlush(markerUser);
        TenantContext.setCurrentTenant(beta.getCode());
        assertThat(users.findByEmailIgnoreCase("alpha-only@example.test")).isEmpty();
        TenantContext.setCurrentTenant(alpha.getCode());
        assertThat(users.findByEmailIgnoreCase("alpha-only@example.test")).isPresent();
        try (Connection connection = master.getConnection()) {
            assertThat(connection.getMetaData().getDatabaseProductName()).isEqualTo("PostgreSQL");
            assertThatThrownBy(() -> connection.createStatement().executeQuery("SELECT * FROM users")).isInstanceOf(SQLException.class);
        }
        // A fresh cache lazily reconstructs pools from persisted registry data.
        provider.close();
        try (Connection connection = provider.getConnection(alpha.getCode())) { assertThat(connection.isValid(2)).isTrue(); }
        TenantContext.clear();
        assertThatThrownBy(users::findAll).isInstanceOf(RuntimeException.class);
    }

    @Test void httpAuthRejectsCrossTenantSuspendedAndAnonymousRequests() throws Exception {
        var alpha = service.onboardTenant(request("autha"));
        var beta = service.onboardTenant(request("authb"));
        mvc.perform(get("/api/v1/master/tenants")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/master/tenants/onboard").contentType("application/json").content("{}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/tenant/users").header("X-Tenant-ID", alpha.getCode())
                .contentType("application/json").content("{}")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/tenant/auth/login").contentType("application/json")
                .content("{\"email\":\"admin@example.test\",\"password\":\"" + ADMIN_PASSWORD + "\"}"))
                .andExpect(status().isBadRequest());
        String login = mvc.perform(post("/api/v1/tenant/auth/login").header("X-Tenant-ID", alpha.getSubdomain())
                .contentType("application/json").content("{\"email\":\"admin@example.test\",\"password\":\"" + ADMIN_PASSWORD + "\"}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        String token = mapper.readTree(login).path("data").path("accessToken").asText();
        mvc.perform(get("/api/v1/master/tenants").header("Authorization", "Bearer " + token)).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/tenant/auth/me").header("Authorization", "Bearer " + token)
                .header("X-Tenant-ID", beta.getCode())).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/tenant/auth/me").header("Authorization", "Bearer " + token)
                .header("X-Tenant-ID", alpha.getCode())).andExpect(status().isOk());
        service.updateTenantStatus(alpha.getId(), "SUSPENDED");
        mvc.perform(get("/api/v1/tenant/auth/me").header("Authorization", "Bearer " + token)).andExpect(status().isForbidden());
        assertThatThrownBy(() -> provider.getConnection(alpha.getCode())).isInstanceOf(BusinessException.class);
        service.updateTenantStatus(alpha.getId(), "ACTIVE");
        try (Connection connection = provider.getConnection(alpha.getCode())) { assertThat(connection.isValid(2)).isTrue(); }
        mvc.perform(get("/api/v1/master/tenants").header("Authorization", "Bearer " + platformToken()))
                .andExpect(status().isOk())
                .andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("dbPassword"))))
                .andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("dbUsername"))));
    }

    @Test void manualProvisionFailureIsRecordedAndRetryRecoversWithoutSharedCredentials() throws Exception {
        var request = request("manual");
        String db = "smarthire_tenant_" + request.getCode();
        String username = "manual_" + UUID.randomUUID().toString().replace("-", "").substring(0, 16);
        request.setCustomDbUrl("jdbc:mysql://" + mysql.getHost() + ":" + mysql.getMappedPort(3306) + "/" + db + "?allowPublicKeyRetrieval=true");
        request.setDbUsername(username); request.setDbPassword("ManualDatabase-123!");
        assertThatThrownBy(() -> service.onboardTenant(request)).isInstanceOf(BusinessException.class);
        TenantInfo failed = tenants.findByCode(request.getCode()).orElseThrow();
        assertThat(failed.getStatus()).isEqualTo("FAILED");
        assertThatThrownBy(() -> provider.getConnection(failed.getCode())).isInstanceOf(BusinessException.class);
        try (Connection root = DriverManager.getConnection(mysql.getJdbcUrl(), "root", mysql.getPassword());
             Statement sql = root.createStatement()) {
            sql.execute("CREATE DATABASE `" + db + "`");
            sql.execute("CREATE USER '" + username + "'@'%' IDENTIFIED BY 'ManualDatabase-123!'");
            sql.execute("GRANT ALL ON `" + db.replace("_", "\\_") + "`.* TO '" + username + "'@'%'");
        }
        assertThat(service.retryProvisioning(failed.getId(), request).getStatus()).isEqualTo("ACTIVE");
        TenantContext.setCurrentTenant(failed.getCode());
        assertThat(users.findAll()).hasSize(1);
        assertThatThrownBy(() -> service.retryProvisioning(failed.getId(), request)).isInstanceOf(BusinessException.class);
    }

    @Test void authenticatedOnboardApiCreatesTenantAndRejectsDuplicateAliases() throws Exception {
        var request = request("http");
        String body = mapper.writeValueAsString(Map.of("code", request.getCode(), "name", request.getName(),
                "subdomain", request.getSubdomain(), "adminName", request.getAdminName(),
                "adminEmail", request.getAdminEmail(), "adminPassword", request.getAdminPassword()));
        mvc.perform(post("/api/v1/master/tenants/onboard").header("Authorization", "Bearer " + platformToken())
                .contentType("application/json").content(body)).andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.status").value("ACTIVE"))
                .andExpect(jsonPath("$.data.dbPassword").doesNotExist());
        var duplicate = request("duplicate"); duplicate.setCode(request.getSubdomain());
        assertThatThrownBy(() -> service.onboardTenant(duplicate)).isInstanceOf(BusinessException.class);
        var tenant = tenants.findByCode(request.getCode()).orElseThrow();
        tenant.setDbUrl("jdbc:mysql://127.0.0.1:1/" + tenant.getDbName());
        tenants.saveAndFlush(tenant); provider.evict(tenant.getCode());
        assertThatThrownBy(() -> provider.getConnection(tenant.getCode()))
                .isInstanceOfSatisfying(BusinessException.class,
                        ex -> assertThat(ex.getCode()).isEqualTo("TENANT_DATABASE_UNAVAILABLE"));
        assertThat(tenants.findByCode(tenant.getCode())).isPresent();
        mvc.perform(post("/api/v1/tenant/auth/login").header("X-Tenant-ID", tenant.getCode())
                .contentType("application/json").content(mapper.writeValueAsString(
                        Map.of("email", request.getAdminEmail(), "password", request.getAdminPassword()))))
                .andExpect(status().isServiceUnavailable());
    }

    @Test void provisioningLockRejectsConcurrentRetryAndApiValidatesInput() throws Exception {
        var request = request("locked");
        var tenant = service.onboardTenant(request);
        tenant.setStatus("FAILED"); tenants.saveAndFlush(tenant); provider.evict(tenant.getCode());
        try (Connection connection = master.getConnection();
             PreparedStatement statement = connection.prepareStatement("SELECT pg_advisory_lock(?)")) {
            statement.setLong(1, tenant.getId()); statement.execute();
            try {
                assertThatThrownBy(() -> service.retryProvisioning(tenant.getId(), request))
                        .isInstanceOfSatisfying(BusinessException.class, ex -> assertThat(ex.getCode()).isEqualTo("PROVISIONING_IN_PROGRESS"));
            } finally {
                try (PreparedStatement unlock = connection.prepareStatement("SELECT pg_advisory_unlock(?)")) {
                    unlock.setLong(1, tenant.getId()); unlock.execute();
                }
            }
        }
        assertThat(service.retryProvisioning(tenant.getId(), request).getStatus()).isEqualTo("ACTIVE");
        mvc.perform(post("/api/v1/master/tenants/onboard").header("Authorization", "Bearer " + platformToken())
                .contentType("application/json").content("{}")).andExpect(status().isBadRequest());
    }

    @Test void corsAcceptsConfiguredOriginAndRejectsUnknownOrigin() throws Exception {
        mvc.perform(options("/api/v1/tenant/auth/login")
                        .header("Origin", "http://localhost:5173")
                        .header("Access-Control-Request-Method", "POST"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"));

        mvc.perform(options("/api/v1/tenant/auth/login")
                        .header("Origin", "https://untrusted.example")
                        .header("Access-Control-Request-Method", "POST"))
                .andExpect(status().isForbidden());
    }
}
