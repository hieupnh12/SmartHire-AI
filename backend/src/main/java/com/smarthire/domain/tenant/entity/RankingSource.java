package com.smarthire.domain.tenant.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
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
@Table(name = "ranking_sources")
public class RankingSource {

    @Id
    @Column(name = "application_id")
    Long applicationId;

    @Column(name = "cv_id")
    Long cvId;

    @Column(name = "submission_id")
    Long submissionId;

    @Column(name = "ai_interview_id")
    Long aiInterviewId;
}
