package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.tenant.entity.CompanyEmailSetting;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface CompanyEmailSettingRepository extends JpaRepository<CompanyEmailSetting, Long> {

    Optional<CompanyEmailSetting> findFirstByOrderByIdDesc();

    Optional<CompanyEmailSetting> findFirstByIsActiveTrueOrderByIdDesc();
}
