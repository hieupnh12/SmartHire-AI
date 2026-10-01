package com.smarthire.tenant.auth.service;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.common.redis.RedisKeys;
import com.smarthire.common.redis.RedisService;
import com.smarthire.domain.enums.UserRole;
import com.smarthire.domain.enums.UserStatus;
import com.smarthire.domain.master.entity.TenantInfo;
import com.smarthire.domain.tenant.entity.User;
import com.smarthire.domain.tenant.repository.UserRepository;
import com.smarthire.multitenancy.context.TenantContext;
import com.smarthire.multitenancy.service.TenantRegistryService;
import com.smarthire.security.JwtTokenProvider;
import com.smarthire.tenant.auth.dto.*;
import com.smarthire.tenant.auth.mapper.AuthMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mapstruct.factory.Mappers;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Duration;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TenantAuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtTokenProvider tokenProvider;

    @Spy
    private AuthMapper authMapper = Mappers.getMapper(AuthMapper.class);

    @Mock
    private RolePermissionService rolePermissionService;

    @Mock
    private TenantRegistryService tenantRegistryService;

    @Mock
    private RedisService redisService;

    @Mock
    private InviteMailSender inviteMailSender;

    @InjectMocks
    private TenantAuthService authService;

    private static final String TENANT_ID = "acme";
    private User testUser;
    private TenantInfo tenantInfo;

    @BeforeEach
    void setUp() {
        TenantContext.setCurrentTenant(TENANT_ID);

        testUser = new User();
        testUser.setId(10L);
        testUser.setEmail("recruiter@acme.com");
        testUser.setFullName("John Recruiter");
        testUser.setPasswordHash("hashed_pwd");
        testUser.setRole(UserRole.RECRUITER.name());
        testUser.setStatus(UserStatus.ACTIVE);

        tenantInfo = new TenantInfo();
        tenantInfo.setCode(TENANT_ID);
        tenantInfo.setSubdomain("acme");
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Test
    void login_Success() {
        LoginRequest request = new LoginRequest();
        request.setEmail("recruiter@acme.com");
        request.setPassword("CorrectPassword123");

        when(redisService.get(anyString())).thenReturn(Optional.of("0"));
        when(userRepository.findByEmailIgnoreCase("recruiter@acme.com")).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches("CorrectPassword123", "hashed_pwd")).thenReturn(true);
        when(tokenProvider.generateToken(testUser, TENANT_ID)).thenReturn("jwt-token-xyz");
        when(tenantRegistryService.requireActive(TENANT_ID)).thenReturn(tenantInfo);
        when(rolePermissionService.permissionsFor(UserRole.RECRUITER.name())).thenReturn(List.of("JOBS", "APPLICANTS"));

        LoginResponse response = authService.login(request);

        assertNotNull(response);
        assertEquals("jwt-token-xyz", response.getAccessToken());
        assertNotNull(response.getRefreshToken());
        assertEquals("Bearer", response.getTokenType());
        assertEquals(TENANT_ID, response.getTenantId());
        assertEquals("acme", response.getSubdomain());
        assertEquals("recruiter@acme.com", response.getUser().getEmail());

        verify(redisService).delete(RedisKeys.tenantLoginFailedAttempts(TENANT_ID, "recruiter@acme.com"));
        verify(redisService).set(startsWith("auth:tenant:refresh:"), eq(TENANT_ID + ":recruiter@acme.com"), any(Duration.class));
    }

    @Test
    void login_RateLimitExceeded_ThrowsTooManyRequests() {
        LoginRequest request = new LoginRequest();
        request.setEmail("recruiter@acme.com");
        request.setPassword("AnyPassword");

        when(redisService.get(anyString())).thenReturn(Optional.of("5"));

        BusinessException ex = assertThrows(BusinessException.class, () -> authService.login(request));
        assertEquals(HttpStatus.TOO_MANY_REQUESTS, ex.getStatus());
        assertEquals("TOO_MANY_LOGIN_ATTEMPTS", ex.getCode());
    }

    @Test
    void login_InvalidPassword_IncrementsRateLimit() {
        LoginRequest request = new LoginRequest();
        request.setEmail("recruiter@acme.com");
        request.setPassword("WrongPassword");

        when(redisService.get(anyString())).thenReturn(Optional.of("1"));
        when(userRepository.findByEmailIgnoreCase("recruiter@acme.com")).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches("WrongPassword", "hashed_pwd")).thenReturn(false);
        when(redisService.increment(anyString(), any(Duration.class))).thenReturn(2L);

        BusinessException ex = assertThrows(BusinessException.class, () -> authService.login(request));
        assertEquals(HttpStatus.UNAUTHORIZED, ex.getStatus());
        assertEquals("INVALID_CREDENTIALS", ex.getCode());

        verify(redisService).increment(RedisKeys.tenantLoginFailedAttempts(TENANT_ID, "recruiter@acme.com"), Duration.ofMinutes(15));
    }

    @Test
    void login_AccountDisabled_ThrowsUnauthorized() {
        testUser.setStatus(UserStatus.LOCKED);
        LoginRequest request = new LoginRequest();
        request.setEmail("recruiter@acme.com");
        request.setPassword("CorrectPassword123");

        when(redisService.get(anyString())).thenReturn(Optional.of("0"));
        when(userRepository.findByEmailIgnoreCase("recruiter@acme.com")).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches("CorrectPassword123", "hashed_pwd")).thenReturn(true);

        BusinessException ex = assertThrows(BusinessException.class, () -> authService.login(request));
        assertEquals(HttpStatus.UNAUTHORIZED, ex.getStatus());
        assertEquals("ACCOUNT_DISABLED", ex.getCode());
    }

    @Test
    void refreshToken_Success() {
        TenantRefreshTokenRequest request = new TenantRefreshTokenRequest("old-refresh-token");
        String refreshKey = RedisKeys.tenantRefreshSession("old-refresh-token");

        when(redisService.get(refreshKey)).thenReturn(Optional.of(TENANT_ID + ":recruiter@acme.com"));
        when(userRepository.findByEmailIgnoreCase("recruiter@acme.com")).thenReturn(Optional.of(testUser));
        when(tokenProvider.generateToken(testUser, TENANT_ID)).thenReturn("new-access-token");
        when(tenantRegistryService.requireActive(TENANT_ID)).thenReturn(tenantInfo);
        when(rolePermissionService.permissionsFor(UserRole.RECRUITER.name())).thenReturn(List.of("JOBS"));

        LoginResponse response = authService.refreshToken(request);

        assertNotNull(response);
        assertEquals("new-access-token", response.getAccessToken());
        assertNotNull(response.getRefreshToken());
        assertNotEquals("old-refresh-token", response.getRefreshToken());

        verify(redisService).delete(refreshKey);
        verify(redisService).set(startsWith("auth:tenant:refresh:"), eq(TENANT_ID + ":recruiter@acme.com"), any(Duration.class));
    }

    @Test
    void refreshToken_InvalidToken_ThrowsUnauthorized() {
        TenantRefreshTokenRequest request = new TenantRefreshTokenRequest("non-existent-token");
        String refreshKey = RedisKeys.tenantRefreshSession("non-existent-token");

        when(redisService.get(refreshKey)).thenReturn(Optional.empty());

        BusinessException ex = assertThrows(BusinessException.class, () -> authService.refreshToken(request));
        assertEquals(HttpStatus.UNAUTHORIZED, ex.getStatus());
        assertEquals("INVALID_REFRESH_TOKEN", ex.getCode());
    }

    @Test
    void refreshToken_TenantMismatch_ThrowsForbidden() {
        TenantRefreshTokenRequest request = new TenantRefreshTokenRequest("valid-token-for-other-tenant");
        String refreshKey = RedisKeys.tenantRefreshSession("valid-token-for-other-tenant");

        when(redisService.get(refreshKey)).thenReturn(Optional.of("other_tenant:recruiter@acme.com"));

        BusinessException ex = assertThrows(BusinessException.class, () -> authService.refreshToken(request));
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatus());
        assertEquals("TENANT_MISMATCH", ex.getCode());
    }

    @Test
    void logout_BlacklistsJwtAndDeletesSession() {
        String authHeader = "Bearer jwt-token-to-blacklist";
        TenantLogoutRequest request = new TenantLogoutRequest("refresh-token-to-delete");

        when(tokenProvider.getRemainingTtl("jwt-token-to-blacklist")).thenReturn(Duration.ofMinutes(25));

        authService.logout(authHeader, request);

        verify(redisService).set(RedisKeys.jwtBlacklist("jwt-token-to-blacklist"), "revoked", Duration.ofMinutes(25));
        verify(redisService).delete(RedisKeys.tenantRefreshSession("refresh-token-to-delete"));
    }

    @Test
    void forgotPassword_GeneratesOtpAndSendsEmail() {
        ForgotPasswordRequest request = new ForgotPasswordRequest("recruiter@acme.com");

        when(userRepository.findByEmailIgnoreCase("recruiter@acme.com")).thenReturn(Optional.of(testUser));
        when(inviteMailSender.send(eq("recruiter@acme.com"), anyString(), anyString())).thenReturn(true);

        authService.forgotPassword(request);

        verify(redisService).set(eq(RedisKeys.tenantPasswordResetOtp(TENANT_ID, "recruiter@acme.com")), anyString(), eq(Duration.ofMinutes(15)));
        verify(inviteMailSender).send(eq("recruiter@acme.com"), contains("Mã xác thực"), anyString());
    }

    @Test
    void resetPassword_Success() {
        ResetPasswordRequest request = new ResetPasswordRequest("recruiter@acme.com", "123456", "BrandNewPassword123");
        String otpKey = RedisKeys.tenantPasswordResetOtp(TENANT_ID, "recruiter@acme.com");

        when(redisService.get(otpKey)).thenReturn(Optional.of("123456"));
        when(userRepository.findByEmailIgnoreCase("recruiter@acme.com")).thenReturn(Optional.of(testUser));
        when(passwordEncoder.encode("BrandNewPassword123")).thenReturn("new_hashed_pwd");

        authService.resetPassword(request);

        assertEquals("new_hashed_pwd", testUser.getPasswordHash());
        verify(userRepository).save(testUser);
        verify(redisService).delete(otpKey);
    }

    @Test
    void resetPassword_InvalidOtp_ThrowsBadRequest() {
        ResetPasswordRequest request = new ResetPasswordRequest("recruiter@acme.com", "999999", "BrandNewPassword123");
        String otpKey = RedisKeys.tenantPasswordResetOtp(TENANT_ID, "recruiter@acme.com");

        when(redisService.get(otpKey)).thenReturn(Optional.of("123456"));

        BusinessException ex = assertThrows(BusinessException.class, () -> authService.resetPassword(request));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        assertEquals("INVALID_OTP", ex.getCode());
        verify(userRepository, never()).save(any());
    }

    @Test
    void changePassword_Success() {
        String authHeader = "Bearer valid-jwt";
        ChangePasswordRequest request = new ChangePasswordRequest("OldPassword123", "NewPassword456");

        when(tokenProvider.validateToken("valid-jwt")).thenReturn(true);
        when(tokenProvider.getEmailFromToken("valid-jwt")).thenReturn("recruiter@acme.com");
        when(userRepository.findByEmailIgnoreCase("recruiter@acme.com")).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches("OldPassword123", "hashed_pwd")).thenReturn(true);
        when(passwordEncoder.matches("NewPassword456", "hashed_pwd")).thenReturn(false);
        when(passwordEncoder.encode("NewPassword456")).thenReturn("hashed_new_pwd");

        authService.changePassword(authHeader, request);

        assertEquals("hashed_new_pwd", testUser.getPasswordHash());
        verify(userRepository).save(testUser);
    }

    @Test
    void changePassword_WrongCurrentPassword_ThrowsBadRequest() {
        String authHeader = "Bearer valid-jwt";
        ChangePasswordRequest request = new ChangePasswordRequest("WrongCurrentPassword", "NewPassword456");

        when(tokenProvider.validateToken("valid-jwt")).thenReturn(true);
        when(tokenProvider.getEmailFromToken("valid-jwt")).thenReturn("recruiter@acme.com");
        when(userRepository.findByEmailIgnoreCase("recruiter@acme.com")).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches("WrongCurrentPassword", "hashed_pwd")).thenReturn(false);

        BusinessException ex = assertThrows(BusinessException.class, () -> authService.changePassword(authHeader, request));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        assertEquals("INVALID_CURRENT_PASSWORD", ex.getCode());
        verify(userRepository, never()).save(any());
    }
}
