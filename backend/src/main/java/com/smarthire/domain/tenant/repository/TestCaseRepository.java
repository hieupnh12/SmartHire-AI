package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.tenant.entity.TestCase;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TestCaseRepository extends JpaRepository<TestCase, Long> {
}

