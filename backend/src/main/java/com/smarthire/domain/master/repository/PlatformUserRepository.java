package com.smarthire.domain.master.repository;

import com.smarthire.domain.master.entity.PlatformUser;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PlatformUserRepository extends JpaRepository<PlatformUser, Long> {
    Optional<PlatformUser> findByEmailIgnoreCase(String email);
    boolean existsByEmailIgnoreCase(String email);
}
