package com.smarthire.domain.tenant.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
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
@Table(name = "cv_analyses")
public class CvAnalysis {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cv_id", nullable = false, unique = true)
    Cv cv;

    @Column(columnDefinition = "TEXT") String summary;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "skills_json", columnDefinition = "json")
    String skillsJson;

    @Column(name = "years_experience", precision = 4, scale = 1) BigDecimal yearsExperience;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "raw_json", columnDefinition = "json")
    String rawJson;

    @Column(name = "model_version", length = 64) String modelVersion;
    @Column(name = "prompt_version", length = 64) String promptVersion;
    @Column(name = "created_at", nullable = false, updatable = false) Instant createdAt;

    @PrePersist
    void onCreate() { createdAt = Instant.now(); }
}
