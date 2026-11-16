package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.tenant.entity.AiInterviewRagAudit;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AiInterviewRagAuditRepository extends JpaRepository<AiInterviewRagAudit, Long> {
    List<AiInterviewRagAudit> findByAiInterview_IdOrderByIdAsc(Long aiInterviewId);
    void deleteByAiInterview_Id(Long aiInterviewId);
}

