package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.tenant.entity.InterviewSchedule;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InterviewScheduleRepository extends JpaRepository<InterviewSchedule, Long> {
}

