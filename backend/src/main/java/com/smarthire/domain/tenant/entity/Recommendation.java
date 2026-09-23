package com.smarthire.domain.tenant.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
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
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "recommendations")
public class Recommendation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @Column(name = "subject_type", nullable = false, length = 32)
    String subjectType;

    @Column(name = "subject_id", nullable = false)
    Long subjectId;

    @Column(name = "target_type", nullable = false, length = 32)
    String targetType;

    @Column(name = "target_id", nullable = false)
    Long targetId;

    @Column(nullable = false, precision = 5, scale = 2)
    BigDecimal score;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "reason_json", columnDefinition = "json")
    String reasonJson;

    @Column(name = "created_at", nullable = false, updatable = false)
    Instant createdAt;

    @PrePersist
    void onCreate() { createdAt = Instant.now(); }
}
