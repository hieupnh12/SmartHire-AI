package com.smarthire.domain.tenant.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "job_alerts")
public class JobAlert extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "candidate_id", nullable = false)
    Candidate candidate;

    @Column(length = 255)
    String keyword;

    @Column(length = 128)
    String department;

    @Column(length = 255)
    String location;

    @Column(name = "work_mode", length = 32)
    String workMode;

    @Column(name = "employment_type", length = 32)
    String employmentType;

    @Builder.Default
    @Column(name = "web_enabled", nullable = false)
    boolean webEnabled = true;

    @Builder.Default
    @Column(name = "email_enabled", nullable = false)
    boolean emailEnabled = true;

    @Builder.Default
    @Column(nullable = false)
    boolean active = true;
}

