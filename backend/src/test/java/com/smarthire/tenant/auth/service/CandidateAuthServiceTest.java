package com.smarthire.tenant.auth.service;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.common.redis.RedisService;
import com.smarthire.domain.enums.OAuthProvider;
import com.smarthire.domain.enums.UserRole;
import com.smarthire.domain.enums.UserStatus;
import com.smarthire.domain.tenant.entity.OauthAccount;
import com.smarthire.domain.tenant.entity.User;
import com.smarthire.domain.tenant.entity.UserProfile;
import com.smarthire.domain.tenant.repository.OauthAccountRepository;
import com.smarthire.domain.tenant.repository.UserProfileRepository;
import com.smarthire.domain.tenant.repository.UserRepository;
import com.smarthire.multitenancy.context.TenantContext;
import com.smarthire.security.JwtTokenProvider;
import com.smarthire.tenant.auth.dto.CandidateLoginResponse;
import com.smarthire.tenant.auth.dto.GoogleLoginRequest;
import com.smarthire.tenant.auth.dto.GooglePayload;
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

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CandidateAuthServiceTest {

    @Mock
    private GoogleTokenVerifierService googleTokenVerifier;

    @Mock
    private UserRepository userRepository;

    @Mock
    private OauthAccountRepository oauthAccountRepository;

    @Mock
    private UserProfileRepository userProfileRepository;

    @Mock
    private JwtTokenProvider tokenProvider;

    @Mock
    private RedisService redisService;

    @Spy
    private AuthMapper authMapper = Mappers.getMapper(AuthMapper.class);

    @InjectMocks
    private CandidateAuthService candidateAuthService;

    @BeforeEach
    void setUp() {
        TenantContext.setCurrentTenant("acme");
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Test
    void authenticateWithGoogle_NewCandidate_SuccessfullyProvisions() {
        // Arrange
        GoogleLoginRequest request = new GoogleLoginRequest("valid-google-id-token");
        GooglePayload payload = new GooglePayload("candidate@acme.com", "Nguyễn Văn A", "https://avatar.com/pic.jpg", "sub-12345", true);

        when(googleTokenVerifier.verifyToken("valid-google-id-token")).thenReturn(payload);
        when(userRepository.findByEmailIgnoreCase("candidate@acme.com")).thenReturn(Optional.empty());

        User savedUser = new User();
        savedUser.setEmail("candidate@acme.com");
        savedUser.setFullName("Nguyễn Văn A");
        savedUser.setRole(UserRole.CANDIDATE.name());
        savedUser.setStatus(UserStatus.ACTIVE);
        when(userRepository.save(any(User.class))).thenReturn(savedUser);

        UserProfile savedProfile = new UserProfile();
        savedProfile.setUser(savedUser);
        savedProfile.setAvatarUrl("https://avatar.com/pic.jpg");
        savedProfile.setHeadline("Candidate");
        when(userProfileRepository.save(any(UserProfile.class))).thenReturn(savedProfile);

        when(tokenProvider.generateToken(any(User.class), eq("acme"))).thenReturn("mocked-jwt-token");

        // Act
        CandidateLoginResponse response = candidateAuthService.authenticateWithGoogle(request);

        // Assert
        assertNotNull(response);
        assertEquals("mocked-jwt-token", response.getAccessToken());
        assertEquals("acme", response.getTenantId());
        assertNotNull(response.getCandidate());
        assertEquals("candidate@acme.com", response.getCandidate().getEmail());
        assertEquals("Nguyễn Văn A", response.getCandidate().getFullName());
        assertEquals("CANDIDATE", response.getCandidate().getRole());

        verify(userRepository, times(1)).save(any(User.class));
        verify(oauthAccountRepository, times(1)).save(any(OauthAccount.class));
        verify(userProfileRepository, times(1)).save(any(UserProfile.class));
    }

    @Test
    void authenticateWithGoogle_ExistingCandidate_ReturnsTokens() {
        // Arrange
        GoogleLoginRequest request = new GoogleLoginRequest("valid-token");
        GooglePayload payload = new GooglePayload("existing@acme.com", "Existing Candidate", null, "sub-9999", true);

        User existingUser = new User();
        existingUser.setEmail("existing@acme.com");
        existingUser.setFullName("Existing Candidate");
        existingUser.setRole(UserRole.CANDIDATE.name());
        existingUser.setStatus(UserStatus.ACTIVE);

        UserProfile existingProfile = new UserProfile();
        existingProfile.setUser(existingUser);
        existingProfile.setHeadline("Senior Java Developer");

        when(googleTokenVerifier.verifyToken("valid-token")).thenReturn(payload);
        when(userRepository.findByEmailIgnoreCase("existing@acme.com")).thenReturn(Optional.of(existingUser));
        when(oauthAccountRepository.findByProviderAndProviderUserId(OAuthProvider.GOOGLE, "sub-9999"))
                .thenReturn(Optional.of(new OauthAccount()));
        when(userProfileRepository.findByUser(existingUser)).thenReturn(Optional.of(existingProfile));
        when(tokenProvider.generateToken(existingUser, "acme")).thenReturn("mocked-jwt-token-2");

        // Act
        CandidateLoginResponse response = candidateAuthService.authenticateWithGoogle(request);

        // Assert
        assertNotNull(response);
        assertEquals("mocked-jwt-token-2", response.getAccessToken());
        assertEquals("existing@acme.com", response.getCandidate().getEmail());
        assertEquals("Senior Java Developer", response.getCandidate().getHeadline());

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void authenticateWithGoogle_DisabledAccount_ThrowsBusinessException() {
        // Arrange
        GoogleLoginRequest request = new GoogleLoginRequest("valid-token");
        GooglePayload payload = new GooglePayload("disabled@acme.com", "Disabled User", null, "sub-8888", true);

        User disabledUser = new User();
        disabledUser.setEmail("disabled@acme.com");
        disabledUser.setStatus(UserStatus.DISABLED);

        when(googleTokenVerifier.verifyToken("valid-token")).thenReturn(payload);
        when(userRepository.findByEmailIgnoreCase("disabled@acme.com")).thenReturn(Optional.of(disabledUser));

        // Act & Assert
        BusinessException ex = assertThrows(BusinessException.class, () -> candidateAuthService.authenticateWithGoogle(request));
        assertEquals("ACCOUNT_DISABLED", ex.getCode());
    }
}
