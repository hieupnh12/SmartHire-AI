package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.tenant.entity.InterviewEvaluation;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InterviewEvaluationRepository extends JpaRepository<InterviewEvaluation, Long> {
    java.util.List<InterviewEvaluation> findByInterview_IdOrderById(Long id);
    java.util.Optional<InterviewEvaluation> findFirstByInterview_IdAndEvaluator_Id(Long interviewId, Long evaluatorId);
}
