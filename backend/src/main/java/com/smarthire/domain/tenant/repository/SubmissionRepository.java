package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.tenant.entity.Submission;
import org.springframework.data.jpa.repository.JpaRepository;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SubmissionRepository extends JpaRepository<Submission, Long> {
    @Query("select s.id from Submission s where s.test.id = :testId and s.application.id = :applicationId order by s.id desc")
    List<Long> findLatestIds(@Param("testId") Long testId, @Param("applicationId") Long applicationId, Pageable pageable);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from Submission s where s.id = :id and s.candidate.id = :candidateId")
    Optional<Submission> findOwnedLocked(@Param("id") Long id, @Param("candidateId") Long candidateId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from Submission s where s.id = :id")
    Optional<Submission> findLockedById(@Param("id") Long id);
}
