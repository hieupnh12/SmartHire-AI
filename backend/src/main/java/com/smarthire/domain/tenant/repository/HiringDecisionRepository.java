package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.tenant.entity.HiringDecision;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface HiringDecisionRepository extends JpaRepository<HiringDecision, Long> {
    List<HiringDecision> findByApplication_IdOrderByIdDesc(Long applicationId);
}

