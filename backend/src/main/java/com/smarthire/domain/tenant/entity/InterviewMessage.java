package com.smarthire.domain.tenant.entity;

import jakarta.persistence.*;
import java.time.Instant;
import lombok.*;

@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
@Entity @Table(name = "interview_messages")
public class InterviewMessage {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "session_id", nullable = false) private InterviewSession session;
    @Column(name = "sequence_no", nullable = false) private int sequenceNo;
    @Column(nullable = false, length = 16) private String role;
    @Column(nullable = false, columnDefinition = "TEXT") private String content;
    @Column(name = "client_request_id", length = 36) private String clientRequestId;
    @Column(name = "recording_key", length = 512) private String recordingKey;
    @Column(name = "recording_mime", length = 128) private String recordingMime;
    @Column(name = "recording_size") private Long recordingSize;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    @PrePersist void onCreate() { createdAt = Instant.now(); }
}
