package com.smarthire.config;

import com.smarthire.domain.master.entity.PlatformUser;
import com.smarthire.domain.master.repository.PlatformUserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "app.bootstrap.admin-enabled", havingValue = "true")
public class DemoDataSeeder implements ApplicationRunner {
    private final PlatformUserRepository users;
    private final PasswordEncoder encoder;
    private final String email;
    private final String password;

    public DemoDataSeeder(PlatformUserRepository users, PasswordEncoder encoder,
            @Value("${app.bootstrap.admin-email}") String email,
            @Value("${app.bootstrap.admin-password}") String password) {
        this.users = users;
        this.encoder = encoder;
        this.email = email;
        this.password = password;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (email.isBlank() || password.length() < 12
                || password.getBytes(java.nio.charset.StandardCharsets.UTF_8).length > 72) {
            throw new IllegalArgumentException("Bootstrap admin requires email and a password of 12 to 72 UTF-8 bytes");
        }
        if (users.count() != 0) return;
        PlatformUser user = new PlatformUser();
        user.setEmail(email);
        user.setFullName("Platform Administrator");
        user.setPasswordHash(encoder.encode(password));
        user.setRole("SUPER_ADMIN");
        user.setStatus("ACTIVE");
        users.save(user);
    }
}
