package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.tenant.entity.AiInterviewLog;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AiInterviewLogRepository extends JpaRepository<AiInterviewLog, Long> {
    List<AiInterviewLog> findByAiInterview_IdOrderByIdAsc(Long aiInterviewId);
}
