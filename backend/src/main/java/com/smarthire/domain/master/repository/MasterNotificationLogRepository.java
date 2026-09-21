package com.smarthire.domain.master.repository;

import com.smarthire.domain.master.entity.MasterNotificationLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MasterNotificationLogRepository extends JpaRepository<MasterNotificationLog, Long> {
}
