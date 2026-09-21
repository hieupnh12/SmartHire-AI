package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.tenant.entity.Answer;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface AnswerRepository extends JpaRepository<Answer, Long> {
    List<Answer> findBySubmission_IdOrderByQuestion_QuestionOrderAscQuestion_IdAsc(Long submissionId);
    Optional<Answer> findBySubmission_IdAndQuestion_Id(Long submissionId, Long questionId);
}
