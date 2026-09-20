package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.tenant.entity.JobSkill;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface JobSkillRepository extends JpaRepository<JobSkill, Long> {
    @Query("select js from JobSkill js join fetch js.skill where js.job.id = :jobId order by js.id asc")
    List<JobSkill> findByJob_IdOrderByIdAsc(@Param("jobId") Long jobId);

    @Query("""
            select s.id, s.name, s.category, js.required, js.weight, js.minLevel
            from JobSkill js join js.skill s
            where js.job.id = :jobId
            order by js.id
            """)
    List<Object[]> findViewRowsByJobId(@Param("jobId") Long jobId);

    void deleteByJob_Id(Long jobId);
}
