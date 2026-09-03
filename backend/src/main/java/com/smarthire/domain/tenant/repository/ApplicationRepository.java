package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.tenant.entity.Application;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ApplicationRepository extends JpaRepository<Application, Long> {
}

