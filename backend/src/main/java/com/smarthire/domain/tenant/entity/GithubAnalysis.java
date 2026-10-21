package com.smarthire.domain.tenant.entity;

import com.smarthire.domain.enums.GithubAnalysisStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Getter
@Setter
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "github_analyses")
public class GithubAnalysis extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cv_id", nullable = false)
    Cv cv;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "job_id", nullable = false)
    Job job;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    GithubAnalysisStatus status = GithubAnalysisStatus.PENDING;

    @Column(precision = 5, scale = 2)
    BigDecimal score;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "source_urls", columnDefinition = "json")
    String sourceUrls;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "result_json", columnDefinition = "json")
    String resultJson;

    @Column(name = "error_code", length = 64)
    String errorCode;

    @Column(name = "error_message", length = 512)
    String errorMessage;

    @Column(name = "strategy_version", nullable = false, length = 32)
    String strategyVersion;

    @Column(name = "model_version", length = 64)
    String modelVersion;

    @Column(name = "prompt_version", length = 32)
    String promptVersion;

    @Column(name = "prompt_tokens", nullable = false)
    int promptTokens;

    @Column(name = "completion_tokens", nullable = false)
    int completionTokens;

    @Column(name = "github_requests", nullable = false)
    int githubRequests;

    @Column(name = "duration_ms", nullable = false)
    int durationMs;

    @Column(name = "cache_hit", nullable = false)
    boolean cacheHit;

    @Column(name = "analyzed_at")
    Instant analyzedAt;
}
