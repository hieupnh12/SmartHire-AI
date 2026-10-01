package com.smarthire.tenant.auth.service;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.common.redis.RedisKeys;
import com.smarthire.common.redis.RedisService;
import com.smarthire.domain.enums.UserRole;
import com.smarthire.domain.tenant.entity.User;
import com.smarthire.domain.tenant.repository.UserRepository;
import com.smarthire.multitenancy.context.TenantContext;
import com.smarthire.multitenancy.service.TenantRegistryService;
import com.smarthire.security.JwtTokenProvider;
import com.smarthire.tenant.auth.dto.*;
import com.smarthire.tenant.auth.mapper.AuthMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Duration;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class TenantAuthService {

    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final Duration LOCK_DURATION = Duration.ofMinutes(15);
    private static final Duration REFRESH_TOKEN_TTL = Duration.ofDays(7);
    private static final Duration OTP_TTL = Duration.ofMinutes(15);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;
    private final AuthMapper authMapper;
    private final RolePermissionService rolePermissionService;
    private final TenantRegistryService tenantRegistryService;
    private final RedisService redisService;
    private final InviteMailSender inviteMailSender;

    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest request) {
        String currentTenant = TenantContext.getCurrentTenant();
        String email = request.getEmail().trim().toLowerCase();
        String rateLimitKey = RedisKeys.tenantLoginFailedAttempts(currentTenant, email);

        // 1. Check brute-force rate limit
        long failedCount = 0;
        try {
            String countStr = redisService.get(rateLimitKey).orElse("0");
            failedCount = Long.parseLong(countStr);
        } catch (Exception ex) {
            log.warn("Failed to check rate limit key in Redis: {}", ex.getMessage());
        }

        if (failedCount >= MAX_FAILED_ATTEMPTS) {
            log.warn("Tenant login blocked due to too many failed attempts for email: {} in tenant: {}", email, currentTenant);
            throw new BusinessException(
                    "Tài khoản tạm thời bị khóa do nhập sai mật khẩu quá 5 lần liên tiếp. Vui lòng thử lại sau 15 phút.",
                    HttpStatus.TOO_MANY_REQUESTS,
                    "TOO_MANY_LOGIN_ATTEMPTS"
            );
        }

        // 2. Query user in isolated tenant database
        User user = userRepository.findByEmailIgnoreCase(email).orElse(null);

        if (user == null || user.getPasswordHash() == null || !passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            long newCount = 1;
            try {
                newCount = redisService.increment(rateLimitKey, LOCK_DURATION);
            } catch (Exception ex) {
                log.warn("Failed to increment rate limit key in Redis: {}", ex.getMessage());
            }

            long remaining = Math.max(0, MAX_FAILED_ATTEMPTS - newCount);
            String errorDetail = remaining > 0
                    ? "Tài khoản hoặc Mật khẩu không chính xác (còn " + remaining + " lần thử trước khi bị khóa tạm thời)."
                    : "Tài khoản hoặc Mật khẩu không chính xác. Tài khoản đã bị tạm khóa 15 phút.";

            throw new BusinessException(errorDetail, HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS");
        }

        if (user.getStatus() == null || !"ACTIVE".equalsIgnoreCase(user.getStatus().name())) {
            throw new BusinessException("Tài khoản của bạn tạm thời bị khóa hoặc ngưng hoạt động", HttpStatus.UNAUTHORIZED, "ACCOUNT_DISABLED");
        }

        // 3. Reset rate limit on successful login
        try {
            redisService.delete(rateLimitKey);
        } catch (Exception ex) {
            log.warn("Could not delete rate limit key in Redis: {}", ex.getMessage());
        }

        // 4. Generate JWT access & refresh tokens
        String accessToken = tokenProvider.generateToken(user, currentTenant);
        String refreshToken = UUID.randomUUID().toString();

        // 5. Store session in Redis
        try {
            String refreshKey = RedisKeys.tenantRefreshSession(refreshToken);
            redisService.set(refreshKey, currentTenant + ":" + user.getEmail(), REFRESH_TOKEN_TTL);
        } catch (Exception ex) {
            log.warn("Could not store tenant refresh token to Redis: {}", ex.getMessage());
        }

        String subdomain = tenantRegistryService.requireActive(currentTenant).getSubdomain();

        return LoginResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .user(withPermissions(user))
                .tenantId(currentTenant)
                .subdomain(subdomain)
                .build();
    }

    @Transactional(readOnly = true)
    public LoginResponse refreshToken(TenantRefreshTokenRequest request) {
        String tokenKey = RedisKeys.tenantRefreshSession(request.getRefreshToken());
        String sessionData = redisService.get(tokenKey).orElseThrow(() ->
                new BusinessException("Refresh token không hợp lệ hoặc đã hết hạn", HttpStatus.UNAUTHORIZED, "INVALID_REFRESH_TOKEN"));

        String sessionTenant;
        String email;
        int colonIdx = sessionData.indexOf(':');
        if (colonIdx > 0) {
            sessionTenant = sessionData.substring(0, colonIdx);
            email = sessionData.substring(colonIdx + 1);
        } else {
            sessionTenant = TenantContext.getCurrentTenant();
            email = sessionData;
        }

        String currentTenant = TenantContext.getCurrentTenant();
        if (StringUtils.hasText(sessionTenant) && StringUtils.hasText(currentTenant)
                && !sessionTenant.equalsIgnoreCase(currentTenant)) {
            throw new BusinessException("Phiên làm việc không thuộc Doanh nghiệp hiện tại", HttpStatus.FORBIDDEN, "TENANT_MISMATCH");
        }

        User user = userRepository.findByEmailIgnoreCase(email).orElseThrow(() ->
                new BusinessException("Không tìm thấy thông tin tài khoản người dùng", HttpStatus.NOT_FOUND, "USER_NOT_FOUND"));

        if (user.getStatus() == null || !"ACTIVE".equalsIgnoreCase(user.getStatus().name())) {
            throw new BusinessException("Tài khoản của bạn tạm thời bị khóa hoặc ngưng hoạt động", HttpStatus.UNAUTHORIZED, "ACCOUNT_DISABLED");
        }

        // Rotate token: Delete old refresh token, generate new one
        try {
            redisService.delete(tokenKey);
        } catch (Exception ex) {
            log.warn("Could not delete old tenant refresh token from Redis: {}", ex.getMessage());
        }

        String effectiveTenant = StringUtils.hasText(currentTenant) ? currentTenant : sessionTenant;
        String newAccessToken = tokenProvider.generateToken(user, effectiveTenant);
        String newRefreshToken = UUID.randomUUID().toString();

        try {
            String newRefreshKey = RedisKeys.tenantRefreshSession(newRefreshToken);
            redisService.set(newRefreshKey, effectiveTenant + ":" + user.getEmail(), REFRESH_TOKEN_TTL);
        } catch (Exception ex) {
            log.warn("Could not store rotated tenant refresh token to Redis: {}", ex.getMessage());
        }

        String subdomain = tenantRegistryService.requireActive(effectiveTenant).getSubdomain();

        return LoginResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(newRefreshToken)
                .tokenType("Bearer")
                .user(withPermissions(user))
                .tenantId(effectiveTenant)
                .subdomain(subdomain)
                .build();
    }

    public void logout(String authHeader, TenantLogoutRequest request) {
        if (StringUtils.hasText(authHeader) && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            Duration remainingTtl = tokenProvider.getRemainingTtl(token);
            if (!remainingTtl.isZero() && !remainingTtl.isNegative()) {
                try {
                    redisService.set(RedisKeys.jwtBlacklist(token), "revoked", remainingTtl);
                    log.info("Blacklisted tenant JWT token with remaining TTL: {}s", remainingTtl.toSeconds());
                } catch (Exception ex) {
                    log.warn("Could not blacklist tenant JWT in Redis: {}", ex.getMessage());
                }
            }
        }

        if (request != null && StringUtils.hasText(request.getRefreshToken())) {
            try {
                redisService.delete(RedisKeys.tenantRefreshSession(request.getRefreshToken()));
            } catch (Exception ex) {
                log.warn("Could not delete tenant refresh token from Redis: {}", ex.getMessage());
            }
        }
    }

    @Transactional(readOnly = true)
    public void forgotPassword(ForgotPasswordRequest request) {
        String currentTenant = TenantContext.getCurrentTenant();
        String email = request.getEmail().trim().toLowerCase();

        Optional<User> userOpt = userRepository.findByEmailIgnoreCase(email);
        if (userOpt.isPresent() && userOpt.get().getStatus() != null
                && "ACTIVE".equalsIgnoreCase(userOpt.get().getStatus().name())) {
            String otp = String.format("%06d", new java.security.SecureRandom().nextInt(1_000_000));
            String otpKey = RedisKeys.tenantPasswordResetOtp(currentTenant, email);
            try {
                redisService.set(otpKey, otp, OTP_TTL);
                log.info("Generated password reset OTP for {} in tenant {}: {}", email, currentTenant, otp);
            } catch (Exception ex) {
                log.warn("Could not save OTP to Redis: {}", ex.getMessage());
            }

            String subject = "[SmartHire] Mã xác thực đặt lại mật khẩu";
            String body = "Xin chào " + userOpt.get().getFullName() + ",\n\n"
                    + "Mã xác thực OTP để đặt lại mật khẩu của bạn là: " + otp + "\n"
                    + "Mã này có hiệu lực trong vòng 15 phút.\n\n"
                    + "Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này.\n\n"
                    + "Trân trọng,\nĐội ngũ SmartHire";
            inviteMailSender.send(email, subject, body);
        } else {
            log.info("Forgot password requested for non-existing or inactive email: {} in tenant: {}", email, currentTenant);
        }
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        String currentTenant = TenantContext.getCurrentTenant();
        String email = request.getEmail().trim().toLowerCase();
        String otpKey = RedisKeys.tenantPasswordResetOtp(currentTenant, email);

        String storedOtp = redisService.get(otpKey).orElse(null);
        if (storedOtp == null || !storedOtp.equals(request.getOtp().trim())) {
            throw new BusinessException("Mã xác thực OTP không chính xác hoặc đã hết hạn", HttpStatus.BAD_REQUEST, "INVALID_OTP");
        }

        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new BusinessException("Không tìm thấy thông tin tài khoản", HttpStatus.NOT_FOUND, "USER_NOT_FOUND"));

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        try {
            redisService.delete(otpKey);
        } catch (Exception ex) {
            log.warn("Could not delete OTP from Redis: {}", ex.getMessage());
        }

        log.info("Password reset successfully for user: {} in tenant: {}", email, currentTenant);
    }

    @Transactional
    public void changePassword(String authHeader, ChangePasswordRequest request) {
        if (!StringUtils.hasText(authHeader) || !authHeader.startsWith("Bearer ")) {
            throw new BusinessException("Missing or invalid Authorization header", HttpStatus.UNAUTHORIZED, "INVALID_TOKEN");
        }

        String token = authHeader.substring(7);
        if (!tokenProvider.validateToken(token)) {
            throw new BusinessException("JWT Token is invalid or expired", HttpStatus.UNAUTHORIZED, "TOKEN_EXPIRED");
        }

        String email = tokenProvider.getEmailFromToken(token);
        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new BusinessException("Không tìm thấy thông tin người dùng", HttpStatus.NOT_FOUND, "USER_NOT_FOUND"));

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw new BusinessException("Mật khẩu hiện tại không chính xác", HttpStatus.BAD_REQUEST, "INVALID_CURRENT_PASSWORD");
        }

        if (passwordEncoder.matches(request.getNewPassword(), user.getPasswordHash())) {
            throw new BusinessException("Mật khẩu mới không được trùng với mật khẩu hiện tại", HttpStatus.BAD_REQUEST, "SAME_PASSWORD");
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        log.info("Password changed successfully for user: {} in tenant: {}", email, TenantContext.getCurrentTenant());
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

        return withPermissions(user);
    }

    private UserResponse withPermissions(User user) {
        UserResponse response = authMapper.toUserResponse(user);
        response.setWorkspace(UserRole.workspaceOf(user.getRole()));
        response.setPermissions(rolePermissionService.permissionsFor(user.getRole()));
        return response;
    }
}
