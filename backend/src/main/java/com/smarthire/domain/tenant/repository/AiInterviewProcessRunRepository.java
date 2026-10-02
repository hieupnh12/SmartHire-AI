package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.enums.AiInterviewProcessStatus;
import com.smarthire.domain.tenant.entity.AiInterviewProcessRun;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AiInterviewProcessRunRepository extends JpaRepository<AiInterviewProcessRun, Long> {
    List<AiInterviewProcessRun> findByAiInterview_IdOrderByProcessOrderAsc(Long interviewId);
    Optional<AiInterviewProcessRun> findFirstByAiInterview_IdAndStatusOrderByProcessOrderAsc(Long interviewId, AiInterviewProcessStatus status);
    void deleteByAiInterview_Id(Long interviewId);
}
