package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.tenant.entity.PracticeSession;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PracticeSessionRepository extends JpaRepository<PracticeSession, Long> {
}

