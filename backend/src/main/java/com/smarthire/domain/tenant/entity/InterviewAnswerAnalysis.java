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
import java.time.Instant;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "interview_answer_analyses")
public class InterviewAnswerAnalysis {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "answer_id", nullable = false, unique = true)
    private InterviewAnswer answer;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "analysis_json", nullable = false, columnDefinition = "json")
    private String analysisJson;

    @Column(name = "model_version", length = 64)
    private String modelVersion;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() { createdAt = Instant.now(); }

    public Long getId() { return id; }
    public InterviewAnswer getAnswer() { return answer; }
    public void setAnswer(InterviewAnswer answer) { this.answer = answer; }
    public String getAnalysisJson() { return analysisJson; }
    public void setAnalysisJson(String analysisJson) { this.analysisJson = analysisJson; }
    public String getModelVersion() { return modelVersion; }
    public void setModelVersion(String modelVersion) { this.modelVersion = modelVersion; }
    public Instant getCreatedAt() { return createdAt; }
}

