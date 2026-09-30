package com.smarthire.domain.tenant.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
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
@Table(name = "candidate_rankings")
public class CandidateRanking {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "job_id", nullable = false)
    Job job;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "application_id", nullable = false)
    Application application;

    @Column(name = "rank_position", nullable = false) int rankPosition;
    @Column(nullable = false, precision = 5, scale = 2) BigDecimal score;
    @Column(name = "ranking_version", length = 32) String rankingVersion;
    @Column(name = "updated_at") Instant updatedAt;

    @PrePersist
    @PreUpdate
    void onUpdate() { updatedAt = Instant.now(); }
}
