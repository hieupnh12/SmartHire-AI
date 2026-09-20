package com.smarthire.domain.tenant.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "coding_problems")
public class CodingProblem {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "assessment_id", nullable = false)
    Assessment assessment;

    @Column(nullable = false) String title;
    @Column(nullable = false, columnDefinition = "TEXT") String prompt;

    @Builder.Default
    @Column(name = "time_limit_ms", nullable = false)
    int timeLimitMs = 2000;

    @Builder.Default
    @Column(name = "memory_mb", nullable = false)
    int memoryMb = 256;
}
