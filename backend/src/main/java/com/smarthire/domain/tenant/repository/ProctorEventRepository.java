package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.tenant.entity.ProctorEvent;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProctorEventRepository extends JpaRepository<ProctorEvent, Long> {
    java.util.List<ProctorEvent> findBySubmission_IdOrderByCreatedAtAsc(Long submissionId);
    long countBySubmission_Id(Long submissionId);
}

