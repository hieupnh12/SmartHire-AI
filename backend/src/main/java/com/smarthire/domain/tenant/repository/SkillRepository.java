package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.tenant.entity.Skill;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SkillRepository extends JpaRepository<Skill, Long> {
}

