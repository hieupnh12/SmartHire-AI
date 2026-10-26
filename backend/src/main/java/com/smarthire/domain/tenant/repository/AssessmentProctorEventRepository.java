package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.tenant.entity.AssessmentProctorEvent;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AssessmentProctorEventRepository extends JpaRepository<AssessmentProctorEvent, Long> {
    List<AssessmentProctorEvent> findBySubmission_IdOrderByIdAsc(Long submissionId);
    long countBySubmission_Id(Long submissionId);
}
