package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.tenant.entity.Question;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuestionRepository extends JpaRepository<Question, Long> {
}

