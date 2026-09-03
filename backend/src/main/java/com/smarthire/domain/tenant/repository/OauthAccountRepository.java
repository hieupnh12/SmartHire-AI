package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.tenant.entity.OauthAccount;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OauthAccountRepository extends JpaRepository<OauthAccount, Long> {
}

