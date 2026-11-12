package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.enums.UserStatus;
import com.smarthire.domain.tenant.entity.JobAlert;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface JobAlertRepository extends JpaRepository<JobAlert, Long> {

    List<JobAlert> findByCandidate_IdOrderByIdDesc(Long candidateId);

    Optional<JobAlert> findByIdAndCandidate_Id(Long id, Long candidateId);

    @Query("""
            select a from JobAlert a
            join fetch a.candidate c
            where a.active = true
              and c.status = :status
            order by a.id asc
            """)
    List<JobAlert> findActiveWithCandidateStatus(@Param("status") UserStatus status);

    long countByCandidate_Id(Long candidateId);

    void deleteByCandidate_Id(Long candidateId);
}

