package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.tenant.entity.Answer;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AnswerRepository extends JpaRepository<Answer, Long> {
}
