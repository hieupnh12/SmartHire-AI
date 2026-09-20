package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.tenant.entity.CvExtraction;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CvExtractionRepository extends JpaRepository<CvExtraction, Long> {
    Optional<CvExtraction> findByCv_Id(Long cvId);
    void deleteByCv_Id(Long cvId);
}
