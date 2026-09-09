package com.smarthire.domain.tenant.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "ranking_sources")
public class RankingSource {
    @Id @Column(name = "application_id") private Long applicationId;
    @Column(name = "cv_id") private Long cvId;
    @Column(name = "attempt_id") private Long attemptId;
    @Column(name = "interview_id") private Long interviewId;
    public Long getApplicationId() { return applicationId; }
    public void setApplicationId(Long value) { applicationId = value; }
    public Long getCvId() { return cvId; }
    public void setCvId(Long value) { cvId = value; }
    public Long getAttemptId() { return attemptId; }
    public void setAttemptId(Long value) { attemptId = value; }
    public Long getInterviewId() { return interviewId; }
    public void setInterviewId(Long value) { interviewId = value; }
}
