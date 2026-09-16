package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.tenant.entity.User;
import com.smarthire.domain.tenant.entity.UserProfile;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserProfileRepository extends JpaRepository<UserProfile, Long> {
    Optional<UserProfile> findByUser(User user);
    Optional<UserProfile> findByUserId(Long userId);
}

