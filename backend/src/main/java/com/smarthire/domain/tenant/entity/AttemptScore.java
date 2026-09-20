package com.smarthire.domain.tenant.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "attempt_scores")
public class AttemptScore {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "attempt_id", nullable = false, unique = true)
    Attempt attempt;

    @Column(name = "total_score", nullable = false, precision = 5, scale = 2) BigDecimal totalScore;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "breakdown_json", columnDefinition = "json")
    String breakdownJson;

    @Column(name = "graded_at", nullable = false) Instant gradedAt;

    @PrePersist
    void onCreate() { gradedAt = Instant.now(); }
}
