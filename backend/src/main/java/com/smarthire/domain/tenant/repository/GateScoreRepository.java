package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.tenant.entity.GateScore;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GateScoreRepository extends JpaRepository<GateScore, Long> {
    Optional<GateScore> findByApplication_Id(Long applicationId);
}
