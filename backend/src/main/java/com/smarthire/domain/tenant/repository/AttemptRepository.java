package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.tenant.entity.Attempt;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AttemptRepository extends JpaRepository<Attempt, Long> {
}

