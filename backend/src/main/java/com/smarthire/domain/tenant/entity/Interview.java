package com.smarthire.domain.tenant.entity;

import com.smarthire.domain.enums.InterviewStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "interviews")
public class Interview extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "application_id", nullable = false)
    Application application;

    @Column(name = "interview_type", nullable = false, length = 64)
    String interviewType;

    @Column(nullable = false, length = 64)
    String mode;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    InterviewStatus status = InterviewStatus.CREATED;
}
