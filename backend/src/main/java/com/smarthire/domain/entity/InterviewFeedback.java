package com.smarthire.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "interview_feedbacks")
public class InterviewFeedback {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "interview_id", nullable = false, unique = true)
    private Interview interview;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "shared_with_candidate", nullable = false)
    private boolean sharedWithCandidate;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() { createdAt = Instant.now(); }

    public Long getId() { return id; }
    public Interview getInterview() { return interview; }
    public void setInterview(Interview interview) { this.interview = interview; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public boolean isSharedWithCandidate() { return sharedWithCandidate; }
    public void setSharedWithCandidate(boolean sharedWithCandidate) { this.sharedWithCandidate = sharedWithCandidate; }
    public Instant getCreatedAt() { return createdAt; }
}
