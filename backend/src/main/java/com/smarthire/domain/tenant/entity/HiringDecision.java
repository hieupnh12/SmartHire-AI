package com.smarthire.domain.tenant.entity;

import com.smarthire.domain.enums.HiringDecisionType;
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
@Table(name = "hiring_decisions")
public class HiringDecision {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "application_id", nullable = false)
    Application application;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    HiringDecisionType decision;

    @Column(columnDefinition = "TEXT") String reason;
    @Column(name = "decided_by", nullable = false) Long decidedBy;
    @Column(name = "created_at", nullable = false, updatable = false) Instant createdAt;

    @PrePersist
    void onCreate() { createdAt = Instant.now(); }
}
