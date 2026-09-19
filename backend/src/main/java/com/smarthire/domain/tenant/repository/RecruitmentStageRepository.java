package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.tenant.entity.RecruitmentStage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RecruitmentStageRepository extends JpaRepository<RecruitmentStage, Long> {
    List<RecruitmentStage> findByJob_IdOrderBySortOrderAsc(Long jobId);
    void deleteByJob_Id(Long jobId);
}

