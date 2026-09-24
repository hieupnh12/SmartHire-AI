package com.smarthire.domain.tenant.entity;

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
@Table(name = "cv_extractions")
public class CvExtraction {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cv_id", nullable = false, unique = true)
    Cv cv;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "extraction_json", nullable = false, columnDefinition = "json")
    String extractionJson;

    @Column(name = "model_version", length = 64) String modelVersion;
    @Column(name = "prompt_version", length = 64) String promptVersion;
    @Column(name = "created_at", nullable = false, updatable = false) Instant createdAt;
    @Column(name = "updated_at") Instant updatedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() { updatedAt = Instant.now(); }
}
