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
@Table(name = "cv_documents")
public class CvDocument {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cv_id", nullable = false, unique = true)
    Cv cv;

    @Column(name = "raw_text", columnDefinition = "LONGTEXT") String rawText;
    @Column(name = "page_count") Integer pageCount;
    @Column(name = "parser_version", length = 64) String parserVersion;

    @Builder.Default
    @Column(name = "ocr_used", nullable = false)
    boolean ocrUsed = false;

    @Column(name = "created_at", nullable = false, updatable = false) Instant createdAt;

    @PrePersist
    void onCreate() { createdAt = Instant.now(); }
}
