package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.enums.ScheduleStatus;
import com.smarthire.domain.tenant.entity.InterviewSchedule;
import java.util.Collection;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InterviewScheduleRepository extends JpaRepository<InterviewSchedule, Long> {
    long countByStatusIn(Collection<ScheduleStatus> statuses);
}

