package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.tenant.entity.AiInterviewConsent;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AiInterviewConsentRepository extends JpaRepository<AiInterviewConsent, Long> {
    Optional<AiInterviewConsent> findByAiInterview_Id(Long interviewId);
}
