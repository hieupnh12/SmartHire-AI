package com.smarthire.domain.tenant.entity;

import com.smarthire.domain.enums.AiAnswerRecordingStatus;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "ai_answer_recordings")
public class AiAnswerRecording {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;
    @OneToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "ai_answer_id", nullable = false, unique = true) AiAnswer aiAnswer;
    @Column(name = "storage_key", nullable = false, length = 512) String storageKey;
    @Column(name = "mime_type", nullable = false, length = 128) String mimeType;
    @Column(name = "size_bytes") Long sizeBytes;
    @Column(name = "duration_seconds") Integer durationSeconds;
    @Builder.Default @Enumerated(EnumType.STRING) @Column(nullable = false, length = 32) AiAnswerRecordingStatus status = AiAnswerRecordingStatus.UPLOADING;
    @Column(name = "transcript_raw", columnDefinition = "TEXT") String transcriptRaw;
    @Column(name = "transcript_confidence", precision = 5, scale = 2) BigDecimal transcriptConfidence;
    @Column(name = "stt_provider", length = 64) String sttProvider;
    @Column(name = "started_at") Instant startedAt;
    @Column(name = "ended_at") Instant endedAt;
    @Column(name = "created_at", nullable = false, updatable = false) Instant createdAt;
    @PrePersist void create() { createdAt = Instant.now(); }
}
