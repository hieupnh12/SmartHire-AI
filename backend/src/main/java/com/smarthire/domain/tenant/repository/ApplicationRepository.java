package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.enums.ApplicationStatus;
import com.smarthire.domain.tenant.entity.Application;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ApplicationRepository extends JpaRepository<Application, Long> {
    Optional<Application> findByIdAndJob_Id(Long id, Long jobId);
    Optional<Application> findByJob_IdAndCandidate_Id(Long jobId, Long candidateId);
    List<Application> findByJob_IdOrderByIdDesc(Long jobId);
    List<Application> findByCandidate_IdOrderByIdDesc(Long candidateId);
    long countByJob_Id(Long jobId);
    long countByCandidate_Id(Long candidateId);

    @Query("""
            select a.job.id, count(a) from Application a
            where a.job.id in :ids group by a.job.id
            """)
    List<Object[]> countGroupedByJobIds(@Param("ids") Collection<Long> ids);

    @Query("""
            select a from Application a
            join a.candidate c
            where a.job.id = :jobId
              and a.status <> com.smarthire.domain.enums.ApplicationStatus.WITHDRAWN
              and (:status is null or a.status = :status)
              and (:source is null or lower(a.source) = lower(:source))
              and ((:archived = true and a.archivedAt is not null) or (:archived = false and a.archivedAt is null))
              and (:q is null or :q = ''
                   or lower(c.fullName) like lower(concat('%', :q, '%'))
                   or lower(c.email) like lower(concat('%', :q, '%'))
                   or lower(coalesce(a.tags, '')) like lower(concat('%', :q, '%'))
                   or lower(coalesce(a.referralCode, '')) like lower(concat('%', :q, '%')))
            """)
    Page<Application> search(
            @Param("jobId") Long jobId,
            @Param("q") String q,
            @Param("status") ApplicationStatus status,
            @Param("source") String source,
            @Param("archived") boolean archived,
            Pageable pageable);
}
