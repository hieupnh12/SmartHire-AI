package com.smarthire.tenant.auth.service;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.common.redis.RedisKeys;
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
import com.smarthire.multitenancy.service.TenantRegistryService;
import com.smarthire.security.JwtTokenProvider;
import com.smarthire.tenant.auth.dto.CandidateLoginResponse;
import com.smarthire.tenant.auth.dto.CandidateProfileResponse;
import com.smarthire.tenant.auth.dto.GoogleLoginRequest;
import com.smarthire.tenant.auth.dto.GooglePayload;
import com.smarthire.tenant.auth.mapper.AuthMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Duration;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class CandidateAuthService {

    private final GoogleTokenVerifierService googleTokenVerifier;
    private final UserRepository userRepository;
    private final OauthAccountRepository oauthAccountRepository;
    private final UserProfileRepository userProfileRepository;
    private final JwtTokenProvider tokenProvider;
    private final RedisService redisService;
    private final AuthMapper authMapper;
    private final TenantRegistryService tenantRegistryService;

    @Transactional
    public CandidateLoginResponse authenticateWithGoogle(GoogleLoginRequest request) {
        // 1. Verify Google ID token
        GooglePayload payload = googleTokenVerifier.verifyToken(request.getIdToken());
        String currentTenant = TenantContext.getCurrentTenant();
        if (!StringUtils.hasText(currentTenant)) {
            currentTenant = "acme";
        }

        log.info("Candidate Google Auth for email: {} in tenant: {}", payload.getEmail(), currentTenant);

        // 2. Query user in isolated tenant database
        Optional<User> userOpt = userRepository.findByEmailIgnoreCase(payload.getEmail());
        User user;
        UserProfile profile;

        if (userOpt.isEmpty()) {
            // 3. JIT Provisioning for new Candidate
            user = new User();
            user.setEmail(payload.getEmail().toLowerCase());
            user.setFullName(StringUtils.hasText(payload.getName()) ? payload.getName() : payload.getEmail());
            user.setRole(UserRole.CANDIDATE.name());
            user.setStatus(UserStatus.ACTIVE);
            user = userRepository.save(user);

            // Create OAuth Account link
            OauthAccount oauthAccount = new OauthAccount();
            oauthAccount.setUser(user);
            oauthAccount.setProvider(OAuthProvider.GOOGLE);
            oauthAccount.setProviderUserId(payload.getSub());
            oauthAccountRepository.save(oauthAccount);

            // Create Initial User Profile
            profile = new UserProfile();
            profile.setUser(user);
            profile.setAvatarUrl(payload.getPictureUrl());
            profile.setHeadline("Candidate");
            profile = userProfileRepository.save(profile);

            log.info("Provisioned new Candidate user id: {} in tenant: {}", user.getId(), currentTenant);
        } else {
            user = userOpt.get();

            // Validate status
            if (user.getStatus() != null && user.getStatus() != UserStatus.ACTIVE) {
                throw new BusinessException("Tài khoản ứng viên của bạn đang bị khóa hoặc ngưng hoạt động",
                        HttpStatus.UNAUTHORIZED, "ACCOUNT_DISABLED");
            }

            // Link Google OAuth if not linked yet
            Optional<OauthAccount> oauthOpt = oauthAccountRepository.findByProviderAndProviderUserId(OAuthProvider.GOOGLE, payload.getSub());
            if (oauthOpt.isEmpty()) {
                OauthAccount oauthAccount = new OauthAccount();
                oauthAccount.setUser(user);
                oauthAccount.setProvider(OAuthProvider.GOOGLE);
                oauthAccount.setProviderUserId(payload.getSub());
                oauthAccountRepository.save(oauthAccount);
            }

            // Fetch or create profile if missing
            final User existingUser = user;
            profile = userProfileRepository.findByUser(existingUser).orElseGet(() -> {
                UserProfile newProfile = new UserProfile();
                newProfile.setUser(existingUser);
                newProfile.setAvatarUrl(payload.getPictureUrl());
                newProfile.setHeadline("Candidate");
                return userProfileRepository.save(newProfile);
            });

            // Update avatar if currently empty
            if (!StringUtils.hasText(profile.getAvatarUrl()) && StringUtils.hasText(payload.getPictureUrl())) {
                profile.setAvatarUrl(payload.getPictureUrl());
                profile = userProfileRepository.save(profile);
            }
        }

        // 4. Generate JWT tokens
        String accessToken = tokenProvider.generateToken(user, currentTenant);
        String refreshToken = UUID.randomUUID().toString();

        // 5. Store session in Redis
        try {
            String redisKey = RedisKeys.refreshSession(user.getId(), refreshToken);
            redisService.set(redisKey, user.getEmail(), Duration.ofDays(7));
        } catch (Exception ex) {
            log.warn("Could not cache candidate refresh token to Redis: {}", ex.getMessage());
        }

        CandidateProfileResponse profileResponse = authMapper.toCandidateProfileResponse(user, profile);
        String subdomain = tenantRegistryService.requireActive(currentTenant).getSubdomain();
        return CandidateLoginResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .tenantId(currentTenant)
                .subdomain(subdomain)
                .candidate(profileResponse)
                .build();
    }
}

