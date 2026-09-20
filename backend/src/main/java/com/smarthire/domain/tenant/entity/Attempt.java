package com.smarthire.domain.tenant.entity;

import com.smarthire.domain.enums.AttemptStatus;
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
@Table(name = "attempts")
public class Attempt {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "assessment_id", nullable = false)
    Assessment assessment;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "application_id", nullable = false)
    Application application;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    AttemptStatus status = AttemptStatus.NOT_STARTED;

    @Column(name = "started_at") Instant startedAt;
    @Column(name = "submitted_at") Instant submittedAt;
    @Column(name = "duration_seconds", nullable = false) int durationSeconds;
    @Column(name = "created_at", nullable = false, updatable = false) Instant createdAt;

    @PrePersist
    void onCreate() { createdAt = Instant.now(); }
}
