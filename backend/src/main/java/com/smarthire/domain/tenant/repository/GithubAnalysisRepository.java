package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.tenant.entity.GithubAnalysis;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GithubAnalysisRepository extends JpaRepository<GithubAnalysis, Long> {
    Optional<GithubAnalysis> findByCv_IdAndJob_Id(Long cvId, Long jobId);
}
