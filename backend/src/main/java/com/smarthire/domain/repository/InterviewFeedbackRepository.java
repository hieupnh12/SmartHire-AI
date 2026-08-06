package com.smarthire.domain.repository;

import com.smarthire.domain.entity.InterviewFeedback;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InterviewFeedbackRepository extends JpaRepository<InterviewFeedback, Long> {
}
