package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.tenant.entity.Cv;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CvRepository extends JpaRepository<Cv, Long> {
    List<Cv> findByJob_IdOrderByIdDesc(Long jobId);
    List<Cv> findByUser_IdOrderByIdDesc(Long userId);
    List<Cv> findByApplication_IdOrderByIdDesc(Long applicationId);
    List<Cv> findByUser_IdAndJob_IdOrderByIdDesc(Long userId, Long jobId);
}
