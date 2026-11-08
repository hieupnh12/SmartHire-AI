package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.tenant.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    org.springframework.data.domain.Page<Notification> findByUser_IdOrderByIdDesc(
            Long userId, org.springframework.data.domain.Pageable pageable);
    java.util.Optional<Notification> findByIdAndUser_Id(Long id, Long userId);

    org.springframework.data.domain.Page<Notification> findByCandidate_IdOrderByIdDesc(
            Long candidateId, org.springframework.data.domain.Pageable pageable);
    java.util.Optional<Notification> findByIdAndCandidate_Id(Long id, Long candidateId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("update Notification n set n.readAt = :now where n.user.id = :userId and n.readAt is null")
    int markAllReadForUser(@org.springframework.data.repository.query.Param("userId") Long userId,
            @org.springframework.data.repository.query.Param("now") java.time.Instant now);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("update Notification n set n.readAt = :now where n.candidate.id = :candidateId and n.readAt is null")
    int markAllReadForCandidate(@org.springframework.data.repository.query.Param("candidateId") Long candidateId,
            @org.springframework.data.repository.query.Param("now") java.time.Instant now);
}

