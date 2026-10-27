package com.smarthire.domain.tenant.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
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
@Table(name = "coding_problems")
public class CodingProblem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "test_id")
    JobTest test;

    @jakarta.persistence.OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id")
    Question question;

    @Builder.Default
    @Column(nullable = false, length = 32)
    String category = "CODING_ALGORITHM";

    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.JSON)
    @Column(name = "starter_code_json", columnDefinition = "json")
    com.fasterxml.jackson.databind.JsonNode starterCodeJson;

    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.JSON)
    @Column(name = "harness_json", columnDefinition = "json")
    com.fasterxml.jackson.databind.JsonNode harnessJson;

    @Builder.Default
    @jakarta.persistence.OneToMany(mappedBy = "codingProblem", cascade = jakarta.persistence.CascadeType.ALL, orphanRemoval = true)
    java.util.List<TestCase> testCases = new java.util.ArrayList<>();

    @Column(nullable = false)
    String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    String prompt;

    @Column(name = "constraints_text", columnDefinition = "TEXT")
    String constraintsText;

    @Column(name = "verified_at")
    java.time.Instant verifiedAt;

    @Column(name = "verified_language", length = 32)
    String verifiedLanguage;

    @Builder.Default
    @Column(name = "time_limit_ms", nullable = false)
    int timeLimitMs = 2000;

    @Builder.Default
    @Column(name = "memory_mb", nullable = false)
    int memoryMb = 256;
}
