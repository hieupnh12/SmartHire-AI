package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.tenant.entity.Job;
import org.springframework.data.jpa.repository.JpaRepository;

public interface JobRepository extends JpaRepository<Job, Long> {
}

