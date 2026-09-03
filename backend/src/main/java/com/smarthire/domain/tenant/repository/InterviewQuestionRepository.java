package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.tenant.entity.InterviewQuestion;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InterviewQuestionRepository extends JpaRepository<InterviewQuestion, Long> {
}

