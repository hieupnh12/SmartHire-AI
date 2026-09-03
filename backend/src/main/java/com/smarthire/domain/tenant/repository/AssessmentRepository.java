package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.tenant.entity.Assessment;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AssessmentRepository extends JpaRepository<Assessment, Long> {
}

