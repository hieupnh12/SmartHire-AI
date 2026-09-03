package com.smarthire.domain.tenant.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "match_scores")
public class MatchScore extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "job_id", nullable = false)
    private Job job;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cv_id", nullable = false)
    private Cv cv;

    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal score;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "breakdown_json", columnDefinition = "json")
    private String breakdownJson;

    @Column(name = "model_version", length = 64)
    private String modelVersion;

    public Job getJob() { return job; }
    public void setJob(Job job) { this.job = job; }
    public Cv getCv() { return cv; }
    public void setCv(Cv cv) { this.cv = cv; }
    public BigDecimal getScore() { return score; }
    public void setScore(BigDecimal score) { this.score = score; }
    public String getBreakdownJson() { return breakdownJson; }
    public void setBreakdownJson(String breakdownJson) { this.breakdownJson = breakdownJson; }
    public String getModelVersion() { return modelVersion; }
    public void setModelVersion(String modelVersion) { this.modelVersion = modelVersion; }
}

