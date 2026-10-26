package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.tenant.entity.JobTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface JobTestRepository extends JpaRepository<JobTest, Long> {
    Optional<JobTest> findByAssignedApplication_Id(Long applicationId);
    boolean existsByAssignedApplication_Id(Long applicationId);
    Page<JobTest> findByJob_Id(Long jobId, Pageable pageable);
    java.util.List<JobTest> findByJob_IdOrderByIdDesc(Long jobId);
    java.util.List<JobTest> findByJob_IdAndStatusOrderByIdDesc(Long jobId, com.smarthire.domain.enums.TestStatus status);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select t from JobTest t where t.id = :id")
    Optional<JobTest> findLockedById(@Param("id") Long id);
}
