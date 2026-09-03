package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.tenant.entity.Cv;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CvRepository extends JpaRepository<Cv, Long> {
}

