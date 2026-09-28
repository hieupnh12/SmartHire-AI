package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.tenant.entity.LandingPageSetting;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface LandingPageSettingRepository extends JpaRepository<LandingPageSetting, Long> {

    Optional<LandingPageSetting> findFirstByOrderByIdAsc();
}
