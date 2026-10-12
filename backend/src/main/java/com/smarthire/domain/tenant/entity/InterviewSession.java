package com.smarthire.domain.tenant.entity;

import jakarta.persistence.*;
import java.time.Instant;
import lombok.*;

@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
@Entity @Table(name = "interview_sessions")
public class InterviewSession {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ai_interview_id", nullable = false, unique = true) private AiInterview aiInterview;
    @Column(name = "max_turns", nullable = false) private int maxTurns;
    @Column(name = "candidate_turns", nullable = false) private int candidateTurns;
    @Column(name = "ended_at") private Instant endedAt;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    @PrePersist void onCreate() { createdAt = Instant.now(); }
}
