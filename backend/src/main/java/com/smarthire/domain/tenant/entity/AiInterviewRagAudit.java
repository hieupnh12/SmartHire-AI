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
import java.math.BigDecimal;
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
@Table(name = "ai_interview_rag_audits")
public class AiInterviewRagAudit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ai_interview_id", nullable = false)
    AiInterview aiInterview;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ai_question_id")
    AiQuestion aiQuestion;

    @Column(name = "candidate_answer", columnDefinition = "TEXT")
    String candidateAnswer;

    @Column(name = "similarity_score", precision = 5, scale = 4)
    BigDecimal similarityScore;

    @Builder.Default
    @Column(name = "threshold_used", precision = 5, scale = 4, nullable = false)
    BigDecimal thresholdUsed = BigDecimal.valueOf(0.6500);

    @Column(name = "matched_keypoints_json", columnDefinition = "JSON")
    String matchedKeypointsJson;

    @Column(name = "missing_keypoints_json", columnDefinition = "JSON")
    String missingKeypointsJson;

    @Column(name = "created_at", nullable = false, updatable = false)
    Instant createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}

