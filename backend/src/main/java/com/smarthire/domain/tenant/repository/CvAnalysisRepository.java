package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.tenant.entity.CvAnalysis;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CvAnalysisRepository extends JpaRepository<CvAnalysis, Long> {
    Optional<CvAnalysis> findByCv_Id(Long cvId);
    void deleteByCv_Id(Long cvId);
}
