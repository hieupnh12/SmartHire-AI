package com.smarthire.domain.repository;

import com.smarthire.domain.entity.InterviewScore;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InterviewScoreRepository extends JpaRepository<InterviewScore, Long> {
}
