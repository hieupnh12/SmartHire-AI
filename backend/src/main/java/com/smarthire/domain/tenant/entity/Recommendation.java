package com.smarthire.domain.tenant.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "recommendations")
public class Recommendation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "subject_type", nullable = false, length = 32)
    private String subjectType;

    @Column(name = "subject_id", nullable = false)
    private Long subjectId;

    @Column(name = "target_type", nullable = false, length = 32)
    private String targetType;

    @Column(name = "target_id", nullable = false)
    private Long targetId;

    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal score;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "reason_json", columnDefinition = "json")
    private String reasonJson;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() { createdAt = Instant.now(); }

    public Long getId() { return id; }
    public String getSubjectType() { return subjectType; }
    public void setSubjectType(String subjectType) { this.subjectType = subjectType; }
    public Long getSubjectId() { return subjectId; }
    public void setSubjectId(Long subjectId) { this.subjectId = subjectId; }
    public String getTargetType() { return targetType; }
    public void setTargetType(String targetType) { this.targetType = targetType; }
    public Long getTargetId() { return targetId; }
    public void setTargetId(Long targetId) { this.targetId = targetId; }
    public BigDecimal getScore() { return score; }
    public void setScore(BigDecimal score) { this.score = score; }
    public String getReasonJson() { return reasonJson; }
    public void setReasonJson(String reasonJson) { this.reasonJson = reasonJson; }
    public Instant getCreatedAt() { return createdAt; }
}

