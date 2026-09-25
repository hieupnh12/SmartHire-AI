package com.smarthire.domain.tenant.entity;

import com.smarthire.domain.enums.JobStatus;
import com.smarthire.domain.enums.ScreeningMode;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "jobs")
public class Job extends BaseEntity {

    @Column(nullable = false) String title;

    @Column(nullable = false, columnDefinition = "TEXT") String description;

    String location;

    @Column(name = "employment_type", length = 32) String employmentType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32) JobStatus status = JobStatus.DRAFT;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by", nullable = false) User createdBy;

    @Column(name = "published_at") Instant publishedAt;

    @Column(name = "closed_at") Instant closedAt;

    @Column(name = "deleted_at") Instant deletedAt;

    @Column(length = 128) String department;

    @Column(name = "work_mode", length = 32) String workMode;

    @Enumerated(EnumType.STRING)
    @Column(name = "screening_mode", nullable = false, length = 16)
    ScreeningMode screeningMode = ScreeningMode.MANUAL;

    Integer headcount;

    Instant deadline;

    @Column(name = "salary_min", precision = 12, scale = 2) BigDecimal salaryMin;

    @Column(name = "salary_max", precision = 12, scale = 2) BigDecimal salaryMax;

    @Column(name = "salary_currency", length = 8) String salaryCurrency;

    @Column(name = "salary_visible", nullable = false) boolean salaryVisible = true;

    @Column(columnDefinition = "TEXT") String responsibilities;

    @Column(columnDefinition = "TEXT") String benefits;

    @Column(name = "min_years_experience", precision = 4, scale = 1) BigDecimal minYearsExperience;

    @Column(name = "education_level", length = 64) String educationLevel;

    @Column(name = "paused_at") Instant pausedAt;
}
