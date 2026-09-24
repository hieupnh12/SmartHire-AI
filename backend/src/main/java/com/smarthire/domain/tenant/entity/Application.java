package com.smarthire.domain.tenant.entity;

import com.smarthire.domain.enums.ApplicationStatus;
import jakarta.persistence.*;
import java.time.Instant;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "applications")
public class Application extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "job_id", nullable = false) Job job;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "candidate_id", nullable = false) User candidate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "stage_id") RecruitmentStage stage;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32) ApplicationStatus status = ApplicationStatus.NEW;

    @Column(length = 64) String source;

    @Column(columnDefinition = "TEXT") String notes;

    @Column(name = "referral_code", length = 64) String referralCode;

    @Column(length = 512) String tags;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assignee_id") User assignee;

    @Column(name = "archived_at") Instant archivedAt;

    @Column(name = "reject_reason", columnDefinition = "TEXT") String rejectReason;

    @Column(name = "withdrawn_at") Instant withdrawnAt;
}
