package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.tenant.entity.Question;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface QuestionRepository extends JpaRepository<Question, Long> {
    List<Question> findByTest_IdOrderByQuestionOrderAscIdAsc(Long testId);
    Optional<Question> findByIdAndTest_Id(Long id, Long testId);
    long countByTest_Id(Long testId);

    @Override
    @EntityGraph(attributePaths = {"test", "test.job"})
    Page<Question> findAll(Pageable pageable);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select q from Question q where q.id = :id")
    Optional<Question> findLockedById(@Param("id") Long id);
}

