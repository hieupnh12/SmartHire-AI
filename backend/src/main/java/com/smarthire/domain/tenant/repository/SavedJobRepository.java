package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.tenant.entity.SavedJob;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SavedJobRepository extends JpaRepository<SavedJob, Long> {

    @Query("""
            select s from SavedJob s
            join fetch s.job j
            where s.candidate.id = :candidateId
              and j.deletedAt is null
            order by s.id desc
            """)
    List<SavedJob> findDetailedByCandidateId(@Param("candidateId") Long candidateId);

    @Query("""
            select s.job.id from SavedJob s
            where s.candidate.id = :candidateId
              and s.job.deletedAt is null
            order by s.id desc
            """)
    List<Long> findJobIdsByCandidateId(@Param("candidateId") Long candidateId);

    Optional<SavedJob> findByCandidate_IdAndJob_Id(Long candidateId, Long jobId);

    boolean existsByCandidate_IdAndJob_Id(Long candidateId, Long jobId);

    void deleteByCandidate_IdAndJob_Id(Long candidateId, Long jobId);

    void deleteByCandidate_Id(Long candidateId);
}

