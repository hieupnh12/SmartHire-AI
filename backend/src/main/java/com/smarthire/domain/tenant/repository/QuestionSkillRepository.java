package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.tenant.entity.QuestionSkill;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuestionSkillRepository extends JpaRepository<QuestionSkill, QuestionSkill.QuestionSkillId> {
    void deleteByQuestionId(Long questionId);
}
