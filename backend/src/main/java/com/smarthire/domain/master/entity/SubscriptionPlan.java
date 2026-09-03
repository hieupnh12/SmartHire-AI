package com.smarthire.domain.master.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "subscription_plans")
public class SubscriptionPlan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 64)
    private String code;

    @Column(nullable = false, length = 128)
    private String name;

    private String description;

    @Column(name = "price_monthly", nullable = false)
    private BigDecimal priceMonthly = BigDecimal.ZERO;

    @Column(name = "price_yearly", nullable = false)
    private BigDecimal priceYearly = BigDecimal.ZERO;

    @Column(name = "max_jobs", nullable = false)
    private Integer maxJobs = 5;

    @Column(name = "max_cv_parses", nullable = false)
    private Integer maxCvParses = 100;

    @Column(name = "max_ai_interview_hours", nullable = false)
    private Integer maxAiInterviewHours = 10;

    @Column(nullable = false, length = 32)
    private String status = "ACTIVE";

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public SubscriptionPlan() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public BigDecimal getPriceMonthly() { return priceMonthly; }
    public void setPriceMonthly(BigDecimal priceMonthly) { this.priceMonthly = priceMonthly; }

    public BigDecimal getPriceYearly() { return priceYearly; }
    public void setPriceYearly(BigDecimal priceYearly) { this.priceYearly = priceYearly; }

    public Integer getMaxJobs() { return maxJobs; }
    public void setMaxJobs(Integer maxJobs) { this.maxJobs = maxJobs; }

    public Integer getMaxCvParses() { return maxCvParses; }
    public void setMaxCvParses(Integer maxCvParses) { this.maxCvParses = maxCvParses; }

    public Integer getMaxAiInterviewHours() { return maxAiInterviewHours; }
    public void setMaxAiInterviewHours(Integer maxAiInterviewHours) { this.maxAiInterviewHours = maxAiInterviewHours; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }
}
