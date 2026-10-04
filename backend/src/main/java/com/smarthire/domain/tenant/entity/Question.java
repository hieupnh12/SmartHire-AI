package com.smarthire.domain.tenant.entity;

import com.fasterxml.jackson.databind.JsonNode;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
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
@Table(name = "questions")
public class Question {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "test_id")
    JobTest test;

    @Column(name = "question_text", nullable = false, columnDefinition = "TEXT")
    String questionText;

    @Column(name = "question_type", nullable = false, length = 32)
    String questionType;

    @Builder.Default
    @Column(nullable = false)
    int points = 1;

    @Builder.Default
    @Column(name = "question_order", nullable = false)
    int questionOrder = 0;

    /** Easy | Medium | Hard — authoring metadata from Excel/UI; nullable for legacy rows. */
    @Column(length = 16)
    String difficulty;

    @Column(length = 255)
    String skill;

    @Column(columnDefinition = "TEXT")
    String explanation;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "authoring_metadata", columnDefinition = "json")
    JsonNode authoringMetadata;

    @Builder.Default
    @Column(name = "bank_archived", nullable = false)
    boolean bankArchived = false;
}
