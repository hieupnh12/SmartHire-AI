package com.smarthire.domain.tenant.entity;

import com.smarthire.domain.enums.HiringDecisionType;
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
@Table(name = "hiring_decisions")
public class HiringDecision {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "application_id", nullable = false)
    private Application application;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private HiringDecisionType decision;

    @Column(columnDefinition = "TEXT")
    private String reason;

    @Column(name = "decided_by", nullable = false)
    private Long decidedBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() { createdAt = Instant.now(); }

    public Long getId() { return id; }
    public Application getApplication() { return application; }
    public void setApplication(Application application) { this.application = application; }
    public HiringDecisionType getDecision() { return decision; }
    public void setDecision(HiringDecisionType decision) { this.decision = decision; }
    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
    public Long getDecidedBy() { return decidedBy; }
    public void setDecidedBy(Long decidedBy) { this.decidedBy = decidedBy; }
    public Instant getCreatedAt() { return createdAt; }
}

