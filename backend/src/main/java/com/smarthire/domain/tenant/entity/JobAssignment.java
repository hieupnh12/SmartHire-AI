package com.smarthire.domain.tenant.entity;

import com.smarthire.domain.enums.AssignmentRole;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(
        name = "job_assignments",
        uniqueConstraints = @UniqueConstraint(name = "uk_job_assignments_job_user", columnNames = {"job_id", "user_id"}))
public class JobAssignment extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "job_id", nullable = false)
    private Job job;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "assignment_role", nullable = false, length = 32)
    private AssignmentRole assignmentRole;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "assigned_by", nullable = false)
    private User assignedBy;

    public Job getJob() { return job; }
    public void setJob(Job job) { this.job = job; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public AssignmentRole getAssignmentRole() { return assignmentRole; }
    public void setAssignmentRole(AssignmentRole assignmentRole) { this.assignmentRole = assignmentRole; }
    public User getAssignedBy() { return assignedBy; }
    public void setAssignedBy(User assignedBy) { this.assignedBy = assignedBy; }
}
