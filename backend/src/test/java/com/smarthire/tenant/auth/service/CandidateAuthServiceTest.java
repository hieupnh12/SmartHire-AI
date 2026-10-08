package com.smarthire.tenant.auth.service;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.common.redis.RedisService;
import com.smarthire.domain.enums.OAuthProvider;
import com.smarthire.domain.enums.UserStatus;
import com.smarthire.domain.master.entity.TenantInfo;
import com.smarthire.domain.tenant.entity.Candidate;
import com.smarthire.domain.tenant.entity.OauthAccount;
import com.smarthire.domain.tenant.repository.CandidateRepository;
import com.smarthire.domain.tenant.repository.OauthAccountRepository;
import com.smarthire.multitenancy.context.TenantContext;
import com.smarthire.multitenancy.service.TenantRegistryService;
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
    private CandidateRepository candidateRepository;

    @Mock
    private OauthAccountRepository oauthAccountRepository;

    @Mock
    private JwtTokenProvider tokenProvider;

    @Mock
    private RedisService redisService;

    @Mock
    private TenantRegistryService tenantRegistryService;

    @Spy
    private AuthMapper authMapper = Mappers.getMapper(AuthMapper.class);

    @InjectMocks
    private CandidateAuthService candidateAuthService;

    @BeforeEach
    void setUp() {
        TenantContext.setCurrentTenant("acme");
        TenantInfo tenant = TenantInfo.builder().code("acme").subdomain("se36").status("ACTIVE").build();
        lenient().when(tenantRegistryService.requireActive("acme")).thenReturn(tenant);
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
        when(candidateRepository.findByEmailIgnoreCase("candidate@acme.com")).thenReturn(Optional.empty());

        Candidate savedCandidate = new Candidate();
        savedCandidate.setEmail("candidate@acme.com");
        savedCandidate.setFullName("Nguyễn Văn A");
        savedCandidate.setAvatarUrl("https://avatar.com/pic.jpg");
        savedCandidate.setHeadline("Candidate");
        savedCandidate.setStatus(UserStatus.ACTIVE);
        when(candidateRepository.save(any(Candidate.class))).thenReturn(savedCandidate);

        when(tokenProvider.generateToken(any(Candidate.class), eq("acme"))).thenReturn("mocked-jwt-token");

        // Act
        CandidateLoginResponse response = candidateAuthService.authenticateWithGoogle(request);

        // Assert
        assertNotNull(response);
        assertEquals("mocked-jwt-token", response.getAccessToken());
        assertEquals("acme", response.getTenantId());
        assertEquals("se36", response.getSubdomain());
        assertNotNull(response.getCandidate());
        assertEquals("candidate@acme.com", response.getCandidate().getEmail());
        assertEquals("Nguyễn Văn A", response.getCandidate().getFullName());
        assertEquals("CANDIDATE", response.getCandidate().getRole());

        verify(candidateRepository, times(1)).save(any(Candidate.class));
        verify(oauthAccountRepository, times(1)).save(any(OauthAccount.class));
    }

    @Test
    void authenticateWithGoogle_ExistingCandidate_ReturnsTokens() {
        // Arrange
        GoogleLoginRequest request = new GoogleLoginRequest("valid-token");
        GooglePayload payload = new GooglePayload("existing@acme.com", "Existing Candidate", null, "sub-9999", true);

        Candidate existingCandidate = new Candidate();
        existingCandidate.setEmail("existing@acme.com");
        existingCandidate.setFullName("Existing Candidate");
        existingCandidate.setHeadline("Senior Java Developer");
        existingCandidate.setStatus(UserStatus.ACTIVE);

        when(googleTokenVerifier.verifyToken("valid-token")).thenReturn(payload);
        when(candidateRepository.findByEmailIgnoreCase("existing@acme.com")).thenReturn(Optional.of(existingCandidate));
        when(oauthAccountRepository.findByProviderAndProviderUserId(OAuthProvider.GOOGLE, "sub-9999"))
                .thenReturn(Optional.of(new OauthAccount()));
        when(tokenProvider.generateToken(existingCandidate, "acme")).thenReturn("mocked-jwt-token-2");

        // Act
        CandidateLoginResponse response = candidateAuthService.authenticateWithGoogle(request);

        // Assert
        assertNotNull(response);
        assertEquals("mocked-jwt-token-2", response.getAccessToken());
        assertEquals("existing@acme.com", response.getCandidate().getEmail());
        assertEquals("Senior Java Developer", response.getCandidate().getHeadline());

        verify(candidateRepository, never()).save(any(Candidate.class));
    }

    @Test
    void authenticateWithGoogle_DisabledAccount_ThrowsBusinessException() {
        // Arrange
        GoogleLoginRequest request = new GoogleLoginRequest("valid-token");
        GooglePayload payload = new GooglePayload("disabled@acme.com", "Disabled User", null, "sub-8888", true);

        Candidate disabledCandidate = new Candidate();
        disabledCandidate.setEmail("disabled@acme.com");
        disabledCandidate.setStatus(UserStatus.DISABLED);

        when(googleTokenVerifier.verifyToken("valid-token")).thenReturn(payload);
        when(candidateRepository.findByEmailIgnoreCase("disabled@acme.com")).thenReturn(Optional.of(disabledCandidate));

        // Act & Assert
        BusinessException ex = assertThrows(BusinessException.class, () -> candidateAuthService.authenticateWithGoogle(request));
        assertEquals("ACCOUNT_DISABLED", ex.getCode());
    }

    @Test
    void authenticateWithGoogle_OrphanOauthAccount_ReusesOauthRowWithoutDuplicateError() {
        GoogleLoginRequest request = new GoogleLoginRequest("valid-token");
        GooglePayload payload = new GooglePayload("newmail@acme.com", "Candidate B", null, "sub-existing-orphan", true);

        OauthAccount orphanOauth = new OauthAccount();
        orphanOauth.setProvider(OAuthProvider.GOOGLE);
        orphanOauth.setProviderUserId("sub-existing-orphan");

        Candidate savedCandidate = new Candidate();
        savedCandidate.setId(55L);
        savedCandidate.setEmail("newmail@acme.com");
        savedCandidate.setFullName("Candidate B");
        savedCandidate.setHeadline("Candidate");
        savedCandidate.setStatus(UserStatus.ACTIVE);

        when(googleTokenVerifier.verifyToken("valid-token")).thenReturn(payload);
        when(oauthAccountRepository.findByProviderAndProviderUserId(OAuthProvider.GOOGLE, "sub-existing-orphan"))
                .thenReturn(Optional.of(orphanOauth));
        when(candidateRepository.findByEmailIgnoreCase("newmail@acme.com")).thenReturn(Optional.empty());
        when(candidateRepository.save(any(Candidate.class))).thenReturn(savedCandidate);
        when(tokenProvider.generateToken(savedCandidate, "acme")).thenReturn("jwt-orphan-linked");

        CandidateLoginResponse response = candidateAuthService.authenticateWithGoogle(request);

        assertNotNull(response);
        assertEquals("jwt-orphan-linked", response.getAccessToken());
        assertSame(savedCandidate, orphanOauth.getCandidate());
        verify(oauthAccountRepository).save(orphanOauth);
    }
}
