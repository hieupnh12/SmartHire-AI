package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.tenant.entity.Interview;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InterviewRepository extends JpaRepository<Interview, Long> {
    java.util.List<Interview> findByApplication_Job_IdAndInterviewTypeStartingWithOrderByIdDesc(Long jobId, String prefix);
    java.util.List<Interview> findByApplication_Candidate_IdAndInterviewTypeStartingWithOrderByIdDesc(Long userId, String prefix);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select i from Interview i where i.id = :id")
    java.util.Optional<Interview> findLockedById(@org.springframework.data.repository.query.Param("id") Long id);
}
