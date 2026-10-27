package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.tenant.entity.EmailOutbox;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EmailOutboxRepository extends JpaRepository<EmailOutbox, Long> {
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    java.util.Optional<EmailOutbox> findFirstByPurposeAndToEmailAndSubjectAndBodyOrderByIdDesc(String purpose, String toEmail, String subject, String body);
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    java.util.Optional<EmailOutbox> findFirstByPurposeAndReferenceKeyOrderByIdDesc(String purpose, String referenceKey);
    java.util.List<EmailOutbox> findTop50ByPurposeAndStatusInAndAttemptsLessThanOrderByIdAsc(
            String purpose, java.util.Collection<com.smarthire.domain.enums.NotificationStatus> statuses, int attempts);
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select e from EmailOutbox e where e.id = :id")
    java.util.Optional<EmailOutbox> findLockedById(@org.springframework.data.repository.query.Param("id") Long id);
}

