package com.smarthire.domain.repository;

import com.smarthire.domain.entity.CandidateRanking;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CandidateRankingRepository extends JpaRepository<CandidateRanking, Long> {
}
