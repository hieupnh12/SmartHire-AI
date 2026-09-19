package com.smarthire.domain.tenant.entity;

import com.smarthire.domain.enums.JobStatus;
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
import java.time.LocalDate;

@Entity
@Table(name = "jobs")
public class Job extends BaseEntity {

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    private String location;

    @Column(name = "employment_type", length = 32)
    private String employmentType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private JobStatus status = JobStatus.DRAFT;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @Column(name = "published_at")
    private Instant publishedAt;

    @Column(name = "closed_at")
    private Instant closedAt;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    @Column(length = 128)
    private String department;

    @Column(name = "work_mode", length = 32)
    private String workMode;

    private Integer headcount;

    private LocalDate deadline;

    @Column(name = "salary_min", precision = 12, scale = 2)
    private BigDecimal salaryMin;

    @Column(name = "salary_max", precision = 12, scale = 2)
    private BigDecimal salaryMax;

    @Column(name = "salary_currency", length = 8)
    private String salaryCurrency;

    @Column(name = "salary_visible", nullable = false)
    private boolean salaryVisible = true;

    @Column(columnDefinition = "TEXT")
    private String responsibilities;

    @Column(columnDefinition = "TEXT")
    private String benefits;

    @Column(name = "min_years_experience", precision = 4, scale = 1)
    private BigDecimal minYearsExperience;

    @Column(name = "education_level", length = 64)
    private String educationLevel;

    @Column(name = "paused_at")
    private Instant pausedAt;

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }
    public String getEmploymentType() { return employmentType; }
    public void setEmploymentType(String employmentType) { this.employmentType = employmentType; }
    public JobStatus getStatus() { return status; }
    public void setStatus(JobStatus status) { this.status = status; }
    public User getCreatedBy() { return createdBy; }
    public void setCreatedBy(User createdBy) { this.createdBy = createdBy; }
    public Instant getPublishedAt() { return publishedAt; }
    public void setPublishedAt(Instant publishedAt) { this.publishedAt = publishedAt; }
    public Instant getClosedAt() { return closedAt; }
    public void setClosedAt(Instant closedAt) { this.closedAt = closedAt; }
    public Instant getDeletedAt() { return deletedAt; }
    public void setDeletedAt(Instant deletedAt) { this.deletedAt = deletedAt; }
    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }
    public String getWorkMode() { return workMode; }
    public void setWorkMode(String workMode) { this.workMode = workMode; }
    public Integer getHeadcount() { return headcount; }
    public void setHeadcount(Integer headcount) { this.headcount = headcount; }
    public LocalDate getDeadline() { return deadline; }
    public void setDeadline(LocalDate deadline) { this.deadline = deadline; }
    public BigDecimal getSalaryMin() { return salaryMin; }
    public void setSalaryMin(BigDecimal salaryMin) { this.salaryMin = salaryMin; }
    public BigDecimal getSalaryMax() { return salaryMax; }
    public void setSalaryMax(BigDecimal salaryMax) { this.salaryMax = salaryMax; }
    public String getSalaryCurrency() { return salaryCurrency; }
    public void setSalaryCurrency(String salaryCurrency) { this.salaryCurrency = salaryCurrency; }
    public boolean isSalaryVisible() { return salaryVisible; }
    public void setSalaryVisible(boolean salaryVisible) { this.salaryVisible = salaryVisible; }
    public String getResponsibilities() { return responsibilities; }
    public void setResponsibilities(String responsibilities) { this.responsibilities = responsibilities; }
    public String getBenefits() { return benefits; }
    public void setBenefits(String benefits) { this.benefits = benefits; }
    public BigDecimal getMinYearsExperience() { return minYearsExperience; }
    public void setMinYearsExperience(BigDecimal minYearsExperience) { this.minYearsExperience = minYearsExperience; }
    public String getEducationLevel() { return educationLevel; }
    public void setEducationLevel(String educationLevel) { this.educationLevel = educationLevel; }
    public Instant getPausedAt() { return pausedAt; }
    public void setPausedAt(Instant pausedAt) { this.pausedAt = pausedAt; }
}

