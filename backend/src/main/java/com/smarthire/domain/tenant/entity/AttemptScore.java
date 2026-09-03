package com.smarthire.domain.tenant.entity;

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
import java.math.BigDecimal;
import java.time.Instant;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "attempt_scores")
public class AttemptScore {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "attempt_id", nullable = false, unique = true)
    private Attempt attempt;

    @Column(name = "total_score", nullable = false, precision = 5, scale = 2)
    private BigDecimal totalScore;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "breakdown_json", columnDefinition = "json")
    private String breakdownJson;

    @Column(name = "graded_at", nullable = false)
    private Instant gradedAt;

    @PrePersist
    void onCreate() { gradedAt = Instant.now(); }

    public Long getId() { return id; }
    public Attempt getAttempt() { return attempt; }
    public void setAttempt(Attempt attempt) { this.attempt = attempt; }
    public BigDecimal getTotalScore() { return totalScore; }
    public void setTotalScore(BigDecimal totalScore) { this.totalScore = totalScore; }
    public String getBreakdownJson() { return breakdownJson; }
    public void setBreakdownJson(String breakdownJson) { this.breakdownJson = breakdownJson; }
    public Instant getGradedAt() { return gradedAt; }
}

