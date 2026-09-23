package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.tenant.entity.JobTest;
import org.springframework.data.jpa.repository.JpaRepository;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface JobTestRepository extends JpaRepository<JobTest, Long> {
    java.util.List<JobTest> findByJob_IdAndStatusOrderByIdDesc(Long jobId, com.smarthire.domain.enums.TestStatus status);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select t from JobTest t where t.id = :id")
    Optional<JobTest> findLockedById(@Param("id") Long id);
}
