package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.tenant.entity.AiAnswer;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AiAnswerRepository extends JpaRepository<AiAnswer, Long> {
    Optional<AiAnswer> findByAiQuestion_Id(Long aiQuestionId);

    List<AiAnswer> findByAiQuestion_IdIn(Collection<Long> aiQuestionIds);

    void deleteByAiQuestion_AiInterview_Id(Long aiInterviewId);
}
