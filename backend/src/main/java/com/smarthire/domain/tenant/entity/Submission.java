package com.smarthire.domain.tenant.entity;

import com.smarthire.domain.enums.TestSubmissionStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
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
@Table(name = "submissions")
public class Submission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "test_id", nullable = false)
    JobTest test;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "candidate_id", nullable = false)
    Candidate candidate;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "application_id", nullable = false)
    Application application;

    @Column(name = "started_at")
    Instant startedAt;

    @Column(name = "objective_completed_at")
    Instant objectiveCompletedAt;

    @Column(name = "submitted_at")
    Instant submittedAt;

    @Column(precision = 10, scale = 2)
    BigDecimal score;

    @Column(columnDefinition = "TEXT")
    String notes;

    @Builder.Default
    @Column(name = "proctor_approved", nullable = false)
    boolean proctorApproved = false;

    @Column(name = "proctor_approved_at")
    Instant proctorApprovedAt;

    @Builder.Default
    @Column(name = "proctor_candidate_ready", nullable = false)
    boolean proctorCandidateReady = false;

    @Column(name = "proctor_meet_url", length = 512)
    String proctorMeetUrl;

    @Builder.Default
    @Column(name = "proctor_violations_count", nullable = false)
    int proctorViolationsCount = 0;

    @Column(name = "proctor_terminated_reason")
    String proctorTerminatedReason;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    TestSubmissionStatus status = TestSubmissionStatus.NOT_STARTED;

    @Column(name = "created_at", nullable = false, updatable = false)
    Instant createdAt;

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
    }
}
