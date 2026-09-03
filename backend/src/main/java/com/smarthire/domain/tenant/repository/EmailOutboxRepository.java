package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.tenant.entity.EmailOutbox;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EmailOutboxRepository extends JpaRepository<EmailOutbox, Long> {
}

