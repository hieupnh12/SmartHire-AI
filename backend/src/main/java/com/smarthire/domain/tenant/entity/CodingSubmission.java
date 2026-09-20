package com.smarthire.domain.tenant.entity;

import com.smarthire.domain.enums.SubmissionStatus;
import jakarta.persistence.*;
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
@Table(name = "coding_submissions")
public class CodingSubmission {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "attempt_id", nullable = false)
    Attempt attempt;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "coding_problem_id", nullable = false)
    CodingProblem codingProblem;

    @Column(nullable = false, length = 32) String language;
    @Column(name = "source_code", nullable = false, columnDefinition = "LONGTEXT") String sourceCode;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    SubmissionStatus status = SubmissionStatus.QUEUED;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "result_json", columnDefinition = "json")
    String resultJson;

    @Column(name = "created_at", nullable = false, updatable = false) Instant createdAt;

    @PrePersist
    void onCreate() { createdAt = Instant.now(); }
}
