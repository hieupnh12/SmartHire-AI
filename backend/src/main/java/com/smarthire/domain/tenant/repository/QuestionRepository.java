package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.tenant.entity.Question;
import com.smarthire.domain.enums.TestStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface QuestionRepository extends JpaRepository<Question, Long>, JpaSpecificationExecutor<Question> {
    List<Question> findByTest_IdOrderByQuestionOrderAscIdAsc(Long testId);
    Optional<Question> findByIdAndTest_Id(Long id, Long testId);
    long countByTest_Id(Long testId);
    long countByBankArchivedTrue();
    long countByTest_Status(TestStatus status);
    long countByIdIn(Collection<Long> ids);

    @Query("select distinct q.skill from Question q where q.skill is not null and q.skill <> '' order by q.skill")
    List<String> findDistinctSkills();

    @Override
    @EntityGraph(attributePaths = {"test", "test.job"})
    Page<Question> findAll(Pageable pageable);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select q from Question q where q.id = :id")
    Optional<Question> findLockedById(@Param("id") Long id);
}

