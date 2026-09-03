package com.smarthire.domain.tenant.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;

@Entity
@Table(name = "job_skills")
public class JobSkill {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "job_id", nullable = false)
    private Job job;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "skill_id", nullable = false)
    private Skill skill;

    @Column(nullable = false)
    private boolean required = true;

    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal weight = BigDecimal.ONE;

    @Column(name = "min_level", length = 32)
    private String minLevel;

    public Long getId() { return id; }
    public Job getJob() { return job; }
    public void setJob(Job job) { this.job = job; }
    public Skill getSkill() { return skill; }
    public void setSkill(Skill skill) { this.skill = skill; }
    public boolean isRequired() { return required; }
    public void setRequired(boolean required) { this.required = required; }
    public BigDecimal getWeight() { return weight; }
    public void setWeight(BigDecimal weight) { this.weight = weight; }
    public String getMinLevel() { return minLevel; }
    public void setMinLevel(String minLevel) { this.minLevel = minLevel; }
}

