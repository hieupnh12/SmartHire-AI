package com.smarthire.domain.tenant.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
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
@Table(name = "ai_questions")
public class AiQuestion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ai_interview_id", nullable = false)
    AiInterview aiInterview;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "process_run_id")
    AiInterviewProcessRun processRun;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_question_id")
    AiQuestion parentQuestion;

    @Column(name = "question_text", nullable = false, columnDefinition = "TEXT")
    String questionText;

    @Column(name = "question_type", nullable = false, length = 32)
    String questionType;

    @Builder.Default
    @Column(name = "question_order", nullable = false)
    int questionOrder = 0;

    @Builder.Default
    @Column(name = "question_role", nullable = false, length = 16)
    String questionRole = "MAIN";

    @Builder.Default
    @Column(name = "sequence_no", nullable = false)
    int sequenceNo = 0;

    @Column(name = "created_at", nullable = false, updatable = false)
    Instant createdAt;

    @Column(name = "rubric_json", columnDefinition = "JSON")
    String rubricJson;
    @Column(name = "options_json", columnDefinition = "JSON")
    String optionsJson;
    @Column(name = "correct_option")
    Integer correctOption;
    @Column(columnDefinition = "TEXT")
    String explanation;

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
    }
}
