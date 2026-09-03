package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.tenant.entity.Interview;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InterviewRepository extends JpaRepository<Interview, Long> {
}

