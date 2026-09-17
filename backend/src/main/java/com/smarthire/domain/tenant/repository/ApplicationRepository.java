package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.tenant.entity.Application;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ApplicationRepository extends JpaRepository<Application, Long> {
    Optional<Application> findByIdAndJob_Id(Long id, Long jobId);
    Optional<Application> findByJob_IdAndCandidate_Id(Long jobId, Long candidateId);
    List<Application> findByJob_IdOrderByIdDesc(Long jobId);
    long countByJob_Id(Long jobId);

    @Query("""
            select a.job.id, count(a) from Application a
            where a.job.id in :ids group by a.job.id
            """)
    List<Object[]> countGroupedByJobIds(@Param("ids") Collection<Long> ids);
}
