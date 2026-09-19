package com.smarthire.domain.tenant.entity;

import com.smarthire.domain.enums.ApplicationStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "applications")
public class Application extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "job_id", nullable = false)
    private Job job;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "candidate_id", nullable = false)
    private User candidate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "stage_id")
    private RecruitmentStage stage;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private ApplicationStatus status = ApplicationStatus.NEW;

    @Column(length = 64)
    private String source;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "referral_code", length = 64)
    private String referralCode;

    @Column(length = 512)
    private String tags;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assignee_id")
    private User assignee;

    @Column(name = "archived_at")
    private java.time.Instant archivedAt;

    @Column(name = "reject_reason", columnDefinition = "TEXT")
    private String rejectReason;

    @Column(name = "withdrawn_at")
    private java.time.Instant withdrawnAt;

    public Job getJob() { return job; }
    public void setJob(Job job) { this.job = job; }
    public User getCandidate() { return candidate; }
    public void setCandidate(User candidate) { this.candidate = candidate; }
    public RecruitmentStage getStage() { return stage; }
    public void setStage(RecruitmentStage stage) { this.stage = stage; }
    public ApplicationStatus getStatus() { return status; }
    public void setStatus(ApplicationStatus status) { this.status = status; }
    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public String getReferralCode() { return referralCode; }
    public void setReferralCode(String referralCode) { this.referralCode = referralCode; }
    public String getTags() { return tags; }
    public void setTags(String tags) { this.tags = tags; }
    public User getAssignee() { return assignee; }
    public void setAssignee(User assignee) { this.assignee = assignee; }
    public java.time.Instant getArchivedAt() { return archivedAt; }
    public void setArchivedAt(java.time.Instant archivedAt) { this.archivedAt = archivedAt; }
    public String getRejectReason() { return rejectReason; }
    public void setRejectReason(String rejectReason) { this.rejectReason = rejectReason; }
    public java.time.Instant getWithdrawnAt() { return withdrawnAt; }
    public void setWithdrawnAt(java.time.Instant withdrawnAt) { this.withdrawnAt = withdrawnAt; }
}

