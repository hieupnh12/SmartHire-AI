package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.tenant.entity.Recommendation;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RecommendationRepository extends JpaRepository<Recommendation, Long> {
}

