package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.tenant.entity.ProctorReport;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProctorReportRepository extends JpaRepository<ProctorReport, Long> {
    Optional<ProctorReport> findBySubmission_Id(Long submissionId);
}
