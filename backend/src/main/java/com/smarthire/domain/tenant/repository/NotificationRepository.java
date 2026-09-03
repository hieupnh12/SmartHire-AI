package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.tenant.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
}

