package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.tenant.entity.UserProfile;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserProfileRepository extends JpaRepository<UserProfile, Long> {
}

