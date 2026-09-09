package com.smarthire.domain.tenant.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "ranking_configs")
public class RankingConfig {
    @Id
    @Column(name = "job_id")
    private Long jobId;
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "config_json", nullable = false, columnDefinition = "json")
    private String configJson;
    @Column(nullable = false)
    private long revision;
    public Long getJobId() { return jobId; }
    public void setJobId(Long value) { jobId = value; }
    public String getConfigJson() { return configJson; }
    public void setConfigJson(String value) { configJson = value; }
    public long getRevision() { return revision; }
    public void setRevision(long value) { revision = value; }
}
