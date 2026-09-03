package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.tenant.entity.CandidateRanking;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CandidateRankingRepository extends JpaRepository<CandidateRanking, Long> {
}

