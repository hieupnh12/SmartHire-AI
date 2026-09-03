package com.smarthire.tenant.auth.service;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.tenant.entity.User;
import com.smarthire.domain.tenant.repository.UserRepository;
import com.smarthire.multitenancy.context.TenantContext;
import com.smarthire.security.JwtTokenProvider;
import com.smarthire.tenant.auth.dto.LoginRequest;
import com.smarthire.tenant.auth.dto.LoginResponse;
import com.smarthire.tenant.auth.dto.UserResponse;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class TenantAuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;

    public TenantAuthService(UserRepository userRepository,
                             PasswordEncoder passwordEncoder,
                             JwtTokenProvider tokenProvider) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenProvider = tokenProvider;
    }

    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest request) {
        String currentTenant = TenantContext.getCurrentTenant();

        User user = userRepository.findByEmailIgnoreCase(request.getEmail())
                .orElseThrow(() -> new BusinessException("Tài khoản '" + request.getEmail() + "' hoặc Mật khẩu không hợp lệ cho Doanh nghiệp [" + (currentTenant != null ? currentTenant.toUpperCase() : "MASTER") + "]. Vui lòng kiểm tra lại Subdomain.", HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS"));

        if (user.getStatus() == null || !"ACTIVE".equalsIgnoreCase(user.getStatus().name())) {
            throw new BusinessException("Tài khoản của bạn tạm thời bị khóa hoặc ngưng hoạt động", HttpStatus.UNAUTHORIZED, "ACCOUNT_DISABLED");
        }

        if (user.getPasswordHash() == null || !passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new BusinessException("Mật khẩu không hợp lệ cho tài khoản [" + request.getEmail() + "]", HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS");
        }

        String accessToken = tokenProvider.generateToken(user, currentTenant);

        return new LoginResponse(accessToken, "Bearer", UserResponse.fromEntity(user), currentTenant);
    }

    @Transactional(readOnly = true)
    public UserResponse getCurrentUser(String authHeader) {
        if (!StringUtils.hasText(authHeader) || !authHeader.startsWith("Bearer ")) {
            throw new BusinessException("Missing or invalid Authorization header", HttpStatus.UNAUTHORIZED, "INVALID_TOKEN");
        }

        String token = authHeader.substring(7);
        if (!tokenProvider.validateToken(token)) {
            throw new BusinessException("JWT Token is invalid or expired", HttpStatus.UNAUTHORIZED, "TOKEN_EXPIRED");
        }

        String email = tokenProvider.getEmailFromToken(token);
        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new BusinessException("User not found in tenant database", HttpStatus.NOT_FOUND, "USER_NOT_FOUND"));

        return UserResponse.fromEntity(user);
    }
}
