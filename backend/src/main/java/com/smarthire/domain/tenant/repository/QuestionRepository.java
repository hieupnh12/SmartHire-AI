package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.tenant.entity.Question;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface QuestionRepository extends JpaRepository<Question, Long> {
    List<Question> findByTest_IdOrderByQuestionOrderAscIdAsc(Long testId);
    Optional<Question> findByIdAndTest_Id(Long id, Long testId);
    long countByTest_Id(Long testId);
}

