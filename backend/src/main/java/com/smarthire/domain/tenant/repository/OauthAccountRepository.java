package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.enums.OAuthProvider;
import com.smarthire.domain.tenant.entity.Candidate;
import com.smarthire.domain.tenant.entity.OauthAccount;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OauthAccountRepository extends JpaRepository<OauthAccount, Long> {
    Optional<OauthAccount> findByProviderAndProviderUserId(OAuthProvider provider, String providerUserId);
    Optional<OauthAccount> findByCandidate(Candidate candidate);
}

