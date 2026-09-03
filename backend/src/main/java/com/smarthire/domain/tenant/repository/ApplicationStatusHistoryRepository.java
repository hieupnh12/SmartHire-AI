package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.tenant.entity.ApplicationStatusHistory;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ApplicationStatusHistoryRepository extends JpaRepository<ApplicationStatusHistory, Long> {
}

