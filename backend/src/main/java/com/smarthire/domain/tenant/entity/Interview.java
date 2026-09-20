package com.smarthire.domain.tenant.entity;

import com.smarthire.domain.enums.InterviewStatus;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "interviews")
public class Interview extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "job_id", nullable = false) Job job;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "candidate_id", nullable = false) User candidate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cv_id") Cv cv;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32) InterviewStatus status = InterviewStatus.CREATED;
}
