package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.tenant.entity.InterviewSession;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InterviewSessionRepository extends JpaRepository<InterviewSession, Long> {
    Optional<InterviewSession> findByAiInterview_Id(Long id);
}
