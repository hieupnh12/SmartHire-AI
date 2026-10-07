package com.smarthire.domain.tenant.entity;

import com.smarthire.domain.enums.AiInterviewProcessStatus;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "ai_interview_process_runs")
public class AiInterviewProcessRun {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "ai_interview_id", nullable = false) AiInterview aiInterview;
    @Column(name = "process_key", nullable = false, length = 64) String processKey;
    @Column(name = "process_order", nullable = false) int processOrder;
    @Builder.Default @Enumerated(EnumType.STRING) @Column(nullable = false, length = 32) AiInterviewProcessStatus status = AiInterviewProcessStatus.PENDING;
    @Column(name = "main_question_target", nullable = false) int mainQuestionTarget;
    @Column(name = "main_question_generated", nullable = false) int mainQuestionGenerated;
    @Column(name = "main_question_completed", nullable = false) int mainQuestionCompleted;
    @Column(name = "follow_up_count", nullable = false) int followUpCount;
    @Column(precision = 10, scale = 2) BigDecimal score;
    @Column(name = "config_snapshot_json", nullable = false, columnDefinition = "JSON") String configSnapshotJson;
    @Column(name = "report_json", columnDefinition = "JSON") String reportJson;
    @Column(name = "started_at") Instant startedAt;
    @Column(name = "completed_at") Instant completedAt;
    @Column(name = "created_at", nullable = false, updatable = false) Instant createdAt;
    @Column(name = "updated_at", nullable = false) Instant updatedAt;
    @PrePersist void create() { var now = Instant.now(); createdAt = now; updatedAt = now; }
    @PreUpdate void update() { updatedAt = Instant.now(); }
}
