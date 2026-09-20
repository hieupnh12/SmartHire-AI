package com.smarthire.domain.tenant.entity;

import com.smarthire.domain.enums.AssessmentStatus;
import jakarta.persistence.*;
import java.time.Instant;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "assessments")
public class Assessment {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "job_id", nullable = false)
    Job job;

    @Column(nullable = false) String title;
    @Column(name = "duration_seconds", nullable = false) int durationSeconds;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    AssessmentStatus status = AssessmentStatus.DRAFT;

    @Column(name = "created_at", nullable = false, updatable = false) Instant createdAt;

    @PrePersist
    void onCreate() { createdAt = Instant.now(); }
}
