package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.tenant.entity.AiFeedback;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AiFeedbackRepository extends JpaRepository<AiFeedback, Long> {
    Optional<AiFeedback> findByAiAnswer_Id(Long aiAnswerId);

    List<AiFeedback> findByAiAnswer_IdIn(Collection<Long> aiAnswerIds);

    void deleteByAiAnswer_AiQuestion_AiInterview_Id(Long aiInterviewId);
}
