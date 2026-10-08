package com.smarthire.domain.tenant.entity;

import jakarta.persistence.*;
import java.time.Instant;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "ai_interview_consents")
public class AiInterviewConsent {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;
    @OneToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "ai_interview_id", nullable = false, unique = true) AiInterview aiInterview;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "candidate_id", nullable = false) Candidate candidate;
    @Column(nullable = false) boolean accepted;
    @Column(name = "policy_version", nullable = false, length = 64) String policyVersion;
    @Column(name = "consented_at", nullable = false) Instant consentedAt;
    @Column(name = "user_agent", length = 512) String userAgent;
    @Column(name = "created_at", nullable = false, updatable = false) Instant createdAt;
    @PrePersist void create() { createdAt = Instant.now(); }
}
