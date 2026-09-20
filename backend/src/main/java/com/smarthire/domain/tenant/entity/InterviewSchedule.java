package com.smarthire.domain.tenant.entity;

import com.smarthire.domain.enums.ScheduleStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
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
@Table(name = "interview_schedules")
public class InterviewSchedule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "application_id", nullable = false)
    Application application;

    @Column(name = "interview_id")
    Long interviewId;

    @Column(name = "starts_at", nullable = false)
    Instant startsAt;

    @Column(name = "ends_at", nullable = false)
    Instant endsAt;

    @Column(nullable = false, length = 64)
    String timezone = "UTC";

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    ScheduleStatus status = ScheduleStatus.PROPOSED;

    @Column(name = "location_or_url", length = 512)
    String locationOrUrl;

    @Column(name = "created_by", nullable = false)
    Long createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    Instant createdAt;

    @PrePersist
    void onCreate() { createdAt = Instant.now(); }
}
