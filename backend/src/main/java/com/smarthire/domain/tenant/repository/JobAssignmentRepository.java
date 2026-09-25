package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.enums.AssignmentRole;
import com.smarthire.domain.tenant.entity.JobAssignment;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface JobAssignmentRepository extends JpaRepository<JobAssignment, Long> {
    List<JobAssignment> findByJob_IdOrderByIdAsc(Long jobId);
    Optional<JobAssignment> findByJob_IdAndUser_Id(Long jobId, Long userId);
    Optional<JobAssignment> findByJob_IdAndAssignmentRole(Long jobId, AssignmentRole assignmentRole);
    boolean existsByJob_IdAndUser_Id(Long jobId, Long userId);

    @Query("""
            select a from JobAssignment a
            join fetch a.job j
            where a.user.id = :userId
              and j.deletedAt is null
            order by j.id desc
            """)
    List<JobAssignment> findActiveByUserId(@Param("userId") Long userId);
}
