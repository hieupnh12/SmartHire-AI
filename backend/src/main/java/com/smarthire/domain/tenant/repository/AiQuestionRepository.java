package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.tenant.entity.AiQuestion;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AiQuestionRepository extends JpaRepository<AiQuestion, Long> {
    long countByAiInterview_Id(Long interviewId);
    List<AiQuestion> findByAiInterview_IdOrderByQuestionOrderAscIdAsc(Long aiInterviewId);
    List<AiQuestion> findByProcessRun_IdOrderBySequenceNoAscIdAsc(Long processRunId);
    long countByProcessRun_IdAndQuestionRole(Long processRunId, String questionRole);

    Optional<AiQuestion> findByIdAndAiInterview_Id(Long id, Long aiInterviewId);

    void deleteByAiInterview_Id(Long aiInterviewId);
}
