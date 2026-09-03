package com.smarthire.master.admin.service;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.master.entity.PlatformUser;
import com.smarthire.domain.master.repository.PlatformUserRepository;
import com.smarthire.master.admin.dto.MasterLoginRequest;
import com.smarthire.master.admin.dto.MasterLoginResponse;
import com.smarthire.master.admin.dto.PlatformUserResponse;
import com.smarthire.security.JwtTokenProvider;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class MasterAuthService {

    private final PlatformUserRepository platformUserRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;

    public MasterAuthService(PlatformUserRepository platformUserRepository,
                              PasswordEncoder passwordEncoder,
                              JwtTokenProvider tokenProvider) {
        this.platformUserRepository = platformUserRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenProvider = tokenProvider;
    }

    @Transactional(readOnly = true)
    public MasterLoginResponse login(MasterLoginRequest request) {
        PlatformUser user = platformUserRepository.findByEmailIgnoreCase(request.getEmail())
                .orElseThrow(() -> new BusinessException("Invalid email or password", HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS"));

        if (!"ACTIVE".equalsIgnoreCase(user.getStatus())) {
            throw new BusinessException("Platform admin account is disabled", HttpStatus.FORBIDDEN, "ACCOUNT_DISABLED");
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new BusinessException("Invalid email or password", HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS");
        }

        String accessToken = tokenProvider.generatePlatformToken(user);

        return new MasterLoginResponse(accessToken, "Bearer", PlatformUserResponse.fromEntity(user), "smarthire_master");
    }

    @Transactional(readOnly = true)
    public PlatformUserResponse getCurrentAdmin(String authHeader) {
        if (!StringUtils.hasText(authHeader) || !authHeader.startsWith("Bearer ")) {
            throw new BusinessException("Missing or invalid Authorization header", HttpStatus.UNAUTHORIZED, "INVALID_TOKEN");
        }

        String token = authHeader.substring(7);
        if (!tokenProvider.validateToken(token)) {
            throw new BusinessException("JWT Token is invalid or expired", HttpStatus.UNAUTHORIZED, "TOKEN_EXPIRED");
        }

        String email = tokenProvider.getEmailFromToken(token);
        PlatformUser user = platformUserRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new BusinessException("Platform admin user not found", HttpStatus.NOT_FOUND, "USER_NOT_FOUND"));

        return PlatformUserResponse.fromEntity(user);
    }
}
