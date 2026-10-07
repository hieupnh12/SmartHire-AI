package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.enums.ScheduleStatus;
import com.smarthire.domain.tenant.entity.InterviewSchedule;
import java.util.Collection;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InterviewScheduleRepository extends JpaRepository<InterviewSchedule, Long> {
    java.util.Optional<InterviewSchedule> findFirstByInterview_IdOrderByIdDesc(Long interviewId);
    @org.springframework.data.jpa.repository.Query("""
        select s from InterviewSchedule s where s.status in :statuses
        and s.scheduledStart < :end and s.scheduledEnd > :start
        and (:excludeId is null or s.interview.id <> :excludeId)
        and (s.interview.application.candidate.id in :users or exists
            (select p from InterviewParticipant p where p.interviewId = s.interview.id and p.userId in :users))
        """)
    java.util.List<InterviewSchedule> conflicts(
        @org.springframework.data.repository.query.Param("users") Collection<Long> users,
        @org.springframework.data.repository.query.Param("start") java.time.Instant start,
        @org.springframework.data.repository.query.Param("end") java.time.Instant end,
        @org.springframework.data.repository.query.Param("excludeId") Long excludeId,
        @org.springframework.data.repository.query.Param("statuses") Collection<ScheduleStatus> statuses);
    long countByStatusIn(Collection<ScheduleStatus> statuses);
}

