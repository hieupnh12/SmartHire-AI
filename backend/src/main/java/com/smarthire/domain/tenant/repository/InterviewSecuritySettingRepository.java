package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.tenant.entity.InterviewSecuritySetting;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InterviewSecuritySettingRepository extends JpaRepository<InterviewSecuritySetting, Long> {
}
