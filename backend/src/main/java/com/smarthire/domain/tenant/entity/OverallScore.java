package com.smarthire.domain.tenant.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "overall_scores")
public class OverallScore {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "application_id", nullable = false, unique = true)
    private Application application;

    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal overall;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "breakdown_json", columnDefinition = "json")
    private String breakdownJson;

    @Column(name = "ranking_version", length = 32)
    private String rankingVersion;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @PreUpdate
    void onUpdate() { updatedAt = Instant.now(); }

    public Long getId() { return id; }
    public Application getApplication() { return application; }
    public void setApplication(Application application) { this.application = application; }
    public BigDecimal getOverall() { return overall; }
    public void setOverall(BigDecimal overall) { this.overall = overall; }
    public String getBreakdownJson() { return breakdownJson; }
    public void setBreakdownJson(String breakdownJson) { this.breakdownJson = breakdownJson; }
    public String getRankingVersion() { return rankingVersion; }
    public void setRankingVersion(String rankingVersion) { this.rankingVersion = rankingVersion; }
    public Instant getUpdatedAt() { return updatedAt; }
}

