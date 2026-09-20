package com.smarthire.domain.tenant.entity;

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
@Table(name = "interview_answers")
public class InterviewAnswer {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "question_id", nullable = false, unique = true)
    InterviewQuestion question;

    @Column(name = "audio_url", length = 512) String audioUrl;
    @Column(columnDefinition = "TEXT") String transcript;

    @Builder.Default
    @Column(nullable = false, length = 32)
    String status = "RECORDED";

    @Column(name = "created_at", nullable = false, updatable = false) Instant createdAt;

    @PrePersist
    void onCreate() { createdAt = Instant.now(); }
}
