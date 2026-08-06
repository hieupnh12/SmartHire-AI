package com.smarthire.domain.repository;

import com.smarthire.domain.entity.OauthAccount;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OauthAccountRepository extends JpaRepository<OauthAccount, Long> {
}
