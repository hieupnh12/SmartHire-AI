package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.tenant.entity.AiFeedback;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AiFeedbackRepository extends JpaRepository<AiFeedback, Long> {
}
