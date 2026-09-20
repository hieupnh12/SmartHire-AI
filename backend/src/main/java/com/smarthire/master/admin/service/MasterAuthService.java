package com.smarthire.master.admin.service;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.common.redis.RedisKeys;
import com.smarthire.common.redis.RedisService;
import com.smarthire.domain.master.entity.PlatformUser;
import com.smarthire.domain.master.repository.PlatformUserRepository;
import com.smarthire.master.admin.dto.MasterLoginRequest;
import com.smarthire.master.admin.dto.MasterLoginResponse;
import com.smarthire.master.admin.dto.MasterRefreshTokenRequest;
import com.smarthire.master.admin.dto.PlatformUserResponse;
import com.smarthire.master.admin.mapper.MasterAuthMapper;
import com.smarthire.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Duration;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class MasterAuthService {

    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final Duration LOCK_DURATION = Duration.ofMinutes(15);
    private static final Duration REFRESH_TOKEN_TTL = Duration.ofDays(7);

    private final PlatformUserRepository platformUserRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;
    private final MasterAuthMapper masterAuthMapper;
    private final RedisService redisService;

    @Transactional(transactionManager = "masterTransactionManager", readOnly = true)
    public MasterLoginResponse login(MasterLoginRequest request) {
        String email = request.getEmail().trim().toLowerCase();
        String rateLimitKey = RedisKeys.masterLoginFailedAttempts(email);

        // 1. Check brute-force rate limit
        long failedCount = 0;
        try {
            String countStr = redisService.get(rateLimitKey).orElse("0");
            failedCount = Long.parseLong(countStr);
        } catch (Exception ex) {
            log.warn("Failed to check rate limit key in Redis: {}", ex.getMessage());
        }

        if (failedCount >= MAX_FAILED_ATTEMPTS) {
            log.warn("Platform Admin login blocked due to too many failed attempts for email: {}", email);
            throw new BusinessException(
                    "Tài khoản quản trị tạm thời bị khóa do nhập sai mật khẩu quá 5 lần liên tiếp. Vui lòng thử lại sau 15 phút.",
                    HttpStatus.TOO_MANY_REQUESTS,
                    "TOO_MANY_LOGIN_ATTEMPTS"
            );
        }

        // 2. Lookup platform user
        PlatformUser user = platformUserRepository.findByEmailIgnoreCase(email)
                .orElse(null);

        if (user == null || !passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            long newCount = 1;
            try {
                newCount = redisService.increment(rateLimitKey, LOCK_DURATION);
            } catch (Exception ex) {
                log.warn("Failed to increment rate limit key in Redis: {}", ex.getMessage());
            }

            long remaining = Math.max(0, MAX_FAILED_ATTEMPTS - newCount);
            String errorDetail = remaining > 0
                    ? "Email hoặc mật khẩu không chính xác (còn " + remaining + " lần thử trước khi bị khóa tạm thời)."
                    : "Email hoặc mật khẩu không chính xác. Tài khoản đã bị tạm khóa 15 phút.";

            throw new BusinessException(errorDetail, HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS");
        }

        // 3. Check account status
        if (!"ACTIVE".equalsIgnoreCase(user.getStatus())) {
            throw new BusinessException("Tài khoản quản trị Platform đang bị khóa hoặc ngưng hoạt động",
                    HttpStatus.FORBIDDEN, "ACCOUNT_DISABLED");
        }

        // 4. Reset rate limit on successful login
        try {
            redisService.delete(rateLimitKey);
        } catch (Exception ex) {
            log.warn("Could not delete rate limit key in Redis: {}", ex.getMessage());
        }

        // 5. Generate tokens
        String accessToken = tokenProvider.generatePlatformToken(user);
        String refreshToken = UUID.randomUUID().toString();

        // 6. Store refresh session in Redis
        try {
            String refreshKey = RedisKeys.masterRefreshSession(refreshToken);
            redisService.set(refreshKey, user.getEmail(), REFRESH_TOKEN_TTL);
        } catch (Exception ex) {
            log.warn("Could not store master refresh token to Redis: {}", ex.getMessage());
        }

        log.info("Platform Admin logged in successfully: {}", user.getEmail());

        return MasterLoginResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .user(masterAuthMapper.toPlatformUserResponse(user))
                .tenantId("smarthire_master")
                .build();
    }

    @Transactional(transactionManager = "masterTransactionManager", readOnly = true)
    public MasterLoginResponse refreshToken(MasterRefreshTokenRequest request) {
        String tokenKey = RedisKeys.masterRefreshSession(request.getRefreshToken());
        String email = redisService.get(tokenKey).orElseThrow(() ->
                new BusinessException("Refresh token không hợp lệ hoặc đã hết hạn", HttpStatus.UNAUTHORIZED, "INVALID_REFRESH_TOKEN"));

        PlatformUser user = platformUserRepository.findByEmailIgnoreCase(email).orElseThrow(() ->
                new BusinessException("Không tìm thấy thông tin tài khoản Quản trị viên", HttpStatus.NOT_FOUND, "USER_NOT_FOUND"));

        if (!"ACTIVE".equalsIgnoreCase(user.getStatus())) {
            throw new BusinessException("Tài khoản quản trị Platform đang bị khóa", HttpStatus.FORBIDDEN, "ACCOUNT_DISABLED");
        }

        // Rotate token: Delete old refresh token, generate new one
        try {
            redisService.delete(tokenKey);
        } catch (Exception ex) {
            log.warn("Could not delete old master refresh token from Redis: {}", ex.getMessage());
        }

        String newAccessToken = tokenProvider.generatePlatformToken(user);
        String newRefreshToken = UUID.randomUUID().toString();

        try {
            String newRefreshKey = RedisKeys.masterRefreshSession(newRefreshToken);
            redisService.set(newRefreshKey, user.getEmail(), REFRESH_TOKEN_TTL);
        } catch (Exception ex) {
            log.warn("Could not store rotated master refresh token to Redis: {}", ex.getMessage());
        }

        return MasterLoginResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(newRefreshToken)
                .tokenType("Bearer")
                .user(masterAuthMapper.toPlatformUserResponse(user))
                .tenantId("smarthire_master")
                .build();
    }

    @Transactional(transactionManager = "masterTransactionManager", readOnly = true)
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

        return masterAuthMapper.toPlatformUserResponse(user);
    }

    public void logout(String authHeader, com.smarthire.master.admin.dto.MasterLogoutRequest request) {
        if (StringUtils.hasText(authHeader) && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            Duration remainingTtl = tokenProvider.getRemainingTtl(token);
            if (!remainingTtl.isZero() && !remainingTtl.isNegative()) {
                try {
                    redisService.set(RedisKeys.jwtBlacklist(token), "revoked", remainingTtl);
                    log.info("Blacklisted master JWT token with remaining TTL: {}s", remainingTtl.toSeconds());
                } catch (Exception ex) {
                    log.warn("Could not blacklist master JWT in Redis: {}", ex.getMessage());
                }
            }
        }

        if (request != null && StringUtils.hasText(request.getRefreshToken())) {
            try {
                redisService.delete(RedisKeys.masterRefreshSession(request.getRefreshToken()));
            } catch (Exception ex) {
                log.warn("Could not delete master refresh token from Redis: {}", ex.getMessage());
            }
        }
    }

    @Transactional(transactionManager = "masterTransactionManager")
    public void changePassword(String authHeader, com.smarthire.master.admin.dto.MasterChangePasswordRequest request) {
        if (!StringUtils.hasText(authHeader) || !authHeader.startsWith("Bearer ")) {
            throw new BusinessException("Missing or invalid Authorization header", HttpStatus.UNAUTHORIZED, "INVALID_TOKEN");
        }

        String token = authHeader.substring(7);
        if (!tokenProvider.validateToken(token)) {
            throw new BusinessException("JWT Token is invalid or expired", HttpStatus.UNAUTHORIZED, "TOKEN_EXPIRED");
        }

        String email = tokenProvider.getEmailFromToken(token);
        PlatformUser user = platformUserRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new BusinessException("Không tìm thấy thông tin tài khoản Quản trị viên", HttpStatus.NOT_FOUND, "USER_NOT_FOUND"));

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw new BusinessException("Mật khẩu hiện tại không chính xác", HttpStatus.BAD_REQUEST, "INVALID_CURRENT_PASSWORD");
        }

        if (passwordEncoder.matches(request.getNewPassword(), user.getPasswordHash())) {
            throw new BusinessException("Mật khẩu mới không được trùng với mật khẩu hiện tại", HttpStatus.BAD_REQUEST, "SAME_PASSWORD");
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        platformUserRepository.save(user);

        log.info("Password changed successfully for Platform Admin: {}", email);
    }
}

