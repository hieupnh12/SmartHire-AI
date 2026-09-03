package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.tenant.entity.InterviewFeedback;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InterviewFeedbackRepository extends JpaRepository<InterviewFeedback, Long> {
}

