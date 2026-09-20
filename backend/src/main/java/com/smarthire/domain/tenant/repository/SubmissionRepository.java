package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.tenant.entity.Submission;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SubmissionRepository extends JpaRepository<Submission, Long> {
}
