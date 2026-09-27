package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.enums.AiInterviewStatus;
import com.smarthire.domain.tenant.entity.AiInterview;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AiInterviewRepository extends JpaRepository<AiInterview, Long> {
    boolean existsByApplication_IdAndStatus(Long applicationId, AiInterviewStatus status);
    List<AiInterview> findTop50ByStatusInOrderByIdAsc(java.util.Collection<AiInterviewStatus> statuses);
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select i from AiInterview i join fetch i.application where i.id = :id")
    java.util.Optional<AiInterview> findByIdForUpdate(@org.springframework.data.repository.query.Param("id") Long id);

    List<AiInterview> findByApplication_Candidate_IdOrderByIdDesc(Long candidateId);

    List<AiInterview> findByApplication_IdOrderByIdDesc(Long applicationId);

    Page<AiInterview> findByApplication_Id(Long applicationId, Pageable pageable);

    Page<AiInterview> findByStatus(AiInterviewStatus status, Pageable pageable);

    Page<AiInterview> findByApplication_IdAndStatus(Long applicationId, AiInterviewStatus status, Pageable pageable);
}
