package com.smarthire.domain.repository;

import com.smarthire.domain.entity.EmailOutbox;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EmailOutboxRepository extends JpaRepository<EmailOutbox, Long> {
}
