package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.tenant.entity.MatchScore;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MatchScoreRepository extends JpaRepository<MatchScore, Long> {
    Optional<MatchScore> findByJob_IdAndCv_Id(Long jobId, Long cvId);
    void deleteByCv_Id(Long cvId);
}
