package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.tenant.entity.CodingProblem;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CodingProblemRepository extends JpaRepository<CodingProblem, Long> {
    java.util.List<CodingProblem> findByTest_Id(Long testId);
    boolean existsByTest_Id(Long testId);
}

