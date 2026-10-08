package com.smarthire.tenant.auth.service;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.common.redis.RedisKeys;
import com.smarthire.common.redis.RedisService;
import com.smarthire.domain.enums.OAuthProvider;
import com.smarthire.domain.enums.UserStatus;
import com.smarthire.domain.tenant.entity.Candidate;
import com.smarthire.domain.tenant.entity.OauthAccount;
import com.smarthire.domain.tenant.repository.CandidateRepository;
import com.smarthire.domain.tenant.repository.OauthAccountRepository;
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
    private final CandidateRepository candidateRepository;
    private final OauthAccountRepository oauthAccountRepository;
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

        // 2. Query existing OAuth link and candidate in isolated tenant database
        Optional<OauthAccount> oauthOpt = oauthAccountRepository.findByProviderAndProviderUserId(
                OAuthProvider.GOOGLE, payload.getSub());
        Optional<Candidate> candidateOpt = candidateRepository.findByEmailIgnoreCase(payload.getEmail());
        if (candidateOpt.isEmpty() && oauthOpt.isPresent() && oauthOpt.get().getCandidate() != null) {
            candidateOpt = Optional.of(oauthOpt.get().getCandidate());
        }

        Candidate candidate;

        if (candidateOpt.isEmpty()) {
            // 3. JIT Provisioning for new Candidate
            candidate = new Candidate();
            candidate.setEmail(payload.getEmail().toLowerCase());
            candidate.setFullName(StringUtils.hasText(payload.getName()) ? payload.getName() : payload.getEmail());
            candidate.setAvatarUrl(payload.getPictureUrl());
            candidate.setHeadline("Candidate");
            candidate.setStatus(UserStatus.ACTIVE);
            candidate = candidateRepository.save(candidate);

            // Create or link OAuth Account
            OauthAccount oauthAccount = oauthOpt.orElseGet(() -> {
                OauthAccount created = new OauthAccount();
                created.setProvider(OAuthProvider.GOOGLE);
                created.setProviderUserId(payload.getSub());
                return created;
            });
            oauthAccount.setCandidate(candidate);
            oauthAccountRepository.save(oauthAccount);

            log.info("Provisioned new Candidate id: {} in tenant: {}", candidate.getId(), currentTenant);
        } else {
            candidate = candidateOpt.get();

            // Validate status
            if (candidate.getStatus() != null && candidate.getStatus() != UserStatus.ACTIVE) {
                throw new BusinessException("Tài khoản ứng viên của bạn đang bị khóa hoặc ngưng hoạt động",
                        HttpStatus.UNAUTHORIZED, "ACCOUNT_DISABLED");
            }

            // Link Google OAuth if not linked yet or if orphan
            if (oauthOpt.isEmpty()) {
                OauthAccount oauthAccount = new OauthAccount();
                oauthAccount.setCandidate(candidate);
                oauthAccount.setProvider(OAuthProvider.GOOGLE);
                oauthAccount.setProviderUserId(payload.getSub());
                oauthAccountRepository.save(oauthAccount);
            } else if (oauthOpt.get().getCandidate() == null) {
                OauthAccount oauthAccount = oauthOpt.get();
                oauthAccount.setCandidate(candidate);
                oauthAccountRepository.save(oauthAccount);
            }

            // Populate avatar/headline if currently empty
            boolean updated = false;
            if (!StringUtils.hasText(candidate.getHeadline())) {
                candidate.setHeadline("Candidate");
                updated = true;
            }
            if (!StringUtils.hasText(candidate.getAvatarUrl()) && StringUtils.hasText(payload.getPictureUrl())) {
                candidate.setAvatarUrl(payload.getPictureUrl());
                updated = true;
            }
            if (updated) {
                candidate = candidateRepository.save(candidate);
            }
        }

        // 4. Generate JWT tokens
        String accessToken = tokenProvider.generateToken(candidate, currentTenant);
        String refreshToken = UUID.randomUUID().toString();

        // 5. Store session in Redis
        try {
            redisService.set(RedisKeys.tenantRefreshSession(refreshToken),
                    currentTenant + ":CANDIDATE:" + candidate.getEmail(), Duration.ofDays(7));
        } catch (Exception ex) {
            log.warn("Could not cache candidate refresh token to Redis: {}", ex.getMessage());
        }

        CandidateProfileResponse profileResponse = authMapper.toCandidateProfileResponse(candidate);
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

