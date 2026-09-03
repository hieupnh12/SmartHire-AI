package com.smarthire.config;

import com.smarthire.domain.enums.UserRole;
import com.smarthire.domain.enums.UserStatus;
import com.smarthire.domain.master.entity.PlatformUser;
import com.smarthire.domain.master.repository.PlatformUserRepository;
import com.smarthire.domain.master.repository.TenantInfoRepository;
import com.smarthire.domain.tenant.entity.User;
import com.smarthire.domain.tenant.repository.UserRepository;
import com.smarthire.master.tenant.dto.OnboardTenantRequest;
import com.smarthire.master.tenant.service.MasterTenantService;
import com.smarthire.multitenancy.context.TenantContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@Order(100)
public class DemoDataSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DemoDataSeeder.class);

    private final MasterTenantService masterTenantService;
    private final TenantInfoRepository tenantInfoRepository;
    private final PlatformUserRepository platformUserRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public DemoDataSeeder(MasterTenantService masterTenantService,
                          TenantInfoRepository tenantInfoRepository,
                          PlatformUserRepository platformUserRepository,
                          UserRepository userRepository,
                          PasswordEncoder passwordEncoder) {
        this.masterTenantService = masterTenantService;
        this.tenantInfoRepository = tenantInfoRepository;
        this.platformUserRepository = platformUserRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(ApplicationArguments args) {
        try {
            // 1. Seed Master DB Platform Super Admin if empty
            if (platformUserRepository.count() == 0) {
                PlatformUser superAdmin = new PlatformUser();
                superAdmin.setEmail("superadmin@smarthire.ai");
                superAdmin.setFullName("SmartHire Platform Super Admin");
                superAdmin.setPasswordHash(passwordEncoder.encode("SuperAdmin123!"));
                superAdmin.setRole("SUPER_ADMIN");
                superAdmin.setStatus("ACTIVE");
                platformUserRepository.save(superAdmin);
                log.info("Seeded Master Platform Super Admin: superadmin@smarthire.ai / SuperAdmin123! [SUPER_ADMIN]");
            }

            // 2. Ensure Acme Tenant exists
            if (!tenantInfoRepository.existsByCode("acme")) {
                OnboardTenantRequest req = new OnboardTenantRequest();
                req.setCode("acme");
                req.setName("Acme Enterprise");
                req.setSubdomain("acme");
                masterTenantService.onboardTenant(req);
                log.info("Onboarded Tenant: Acme Enterprise [acme]");
            }

            // 3. Set Tenant Context
            TenantContext.setCurrentTenant("acme");

            // 4. Seed Admin user for acme if users table is empty
            if (userRepository.count() == 0) {
                User admin = new User();
                admin.setEmail("admin@acme.com");
                admin.setFullName("Acme Admin");
                admin.setPasswordHash(passwordEncoder.encode("Password123!"));
                admin.setRole(UserRole.TENANT_ADMIN);
                admin.setStatus(UserStatus.ACTIVE);
                userRepository.save(admin);
                log.info("Seeded initial Admin user: admin@acme.com / Password123! [TENANT_ADMIN]");
            }
        } catch (Exception e) {
            log.error("Error seeding initial data: {}", e.getMessage(), e);
        } finally {
            TenantContext.clear();
        }
    }
}
