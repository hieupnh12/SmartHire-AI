package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.tenant.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    org.springframework.data.domain.Page<Notification> findByUser_IdOrderByIdDesc(
            Long userId, org.springframework.data.domain.Pageable pageable);
    java.util.Optional<Notification> findByIdAndUser_Id(Long id, Long userId);

    @org.springframework.data.jpa.repository.Query(
            value = "SELECT * FROM notifications n WHERE n.user_id = :userId AND JSON_EXTRACT(n.payload_json, '$.jobId') = :jobId ORDER BY n.id DESC",
            countQuery = "SELECT COUNT(*) FROM notifications n WHERE n.user_id = :userId AND JSON_EXTRACT(n.payload_json, '$.jobId') = :jobId",
            nativeQuery = true)
    org.springframework.data.domain.Page<Notification> findByUser_IdAndJobId(
            @org.springframework.data.repository.query.Param("userId") Long userId,
            @org.springframework.data.repository.query.Param("jobId") Long jobId,
            org.springframework.data.domain.Pageable pageable);

    org.springframework.data.domain.Page<Notification> findByCandidate_IdOrderByIdDesc(
            Long candidateId, org.springframework.data.domain.Pageable pageable);
    java.util.Optional<Notification> findByIdAndCandidate_Id(Long id, Long candidateId);

    @org.springframework.data.jpa.repository.Query(
            value = "SELECT * FROM notifications n WHERE n.candidate_id = :candidateId AND JSON_EXTRACT(n.payload_json, '$.jobId') = :jobId ORDER BY n.id DESC",
            countQuery = "SELECT COUNT(*) FROM notifications n WHERE n.candidate_id = :candidateId AND JSON_EXTRACT(n.payload_json, '$.jobId') = :jobId",
            nativeQuery = true)
    org.springframework.data.domain.Page<Notification> findByCandidate_IdAndJobId(
            @org.springframework.data.repository.query.Param("candidateId") Long candidateId,
            @org.springframework.data.repository.query.Param("jobId") Long jobId,
            org.springframework.data.domain.Pageable pageable);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("update Notification n set n.readAt = :now where n.user.id = :userId and n.readAt is null")
    int markAllReadForUser(@org.springframework.data.repository.query.Param("userId") Long userId,
            @org.springframework.data.repository.query.Param("now") java.time.Instant now);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query(
            value = "UPDATE notifications n SET n.read_at = :now WHERE n.user_id = :userId AND n.read_at IS NULL AND JSON_EXTRACT(n.payload_json, '$.jobId') = :jobId",
            nativeQuery = true)
    int markAllReadForUserAndJob(
            @org.springframework.data.repository.query.Param("userId") Long userId,
            @org.springframework.data.repository.query.Param("jobId") Long jobId,
            @org.springframework.data.repository.query.Param("now") java.time.Instant now);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("update Notification n set n.readAt = :now where n.candidate.id = :candidateId and n.readAt is null")
    int markAllReadForCandidate(@org.springframework.data.repository.query.Param("candidateId") Long candidateId,
            @org.springframework.data.repository.query.Param("now") java.time.Instant now);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query(
            value = "UPDATE notifications n SET n.read_at = :now WHERE n.candidate_id = :candidateId AND n.read_at IS NULL AND JSON_EXTRACT(n.payload_json, '$.jobId') = :jobId",
            nativeQuery = true)
    int markAllReadForCandidateAndJob(
            @org.springframework.data.repository.query.Param("candidateId") Long candidateId,
            @org.springframework.data.repository.query.Param("jobId") Long jobId,
            @org.springframework.data.repository.query.Param("now") java.time.Instant now);
}

