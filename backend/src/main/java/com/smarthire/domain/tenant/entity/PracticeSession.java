package com.smarthire.domain.tenant.entity;

import com.smarthire.domain.enums.PracticeStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "practice_sessions")
public class PracticeSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "candidate_id", nullable = false)
    private User candidate;

    private String topic;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private PracticeStatus status = PracticeStatus.CREATED;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() { createdAt = Instant.now(); }

    public Long getId() { return id; }
    public User getCandidate() { return candidate; }
    public void setCandidate(User candidate) { this.candidate = candidate; }
    public String getTopic() { return topic; }
    public void setTopic(String topic) { this.topic = topic; }
    public PracticeStatus getStatus() { return status; }
    public void setStatus(PracticeStatus status) { this.status = status; }
    public Instant getCreatedAt() { return createdAt; }
}

