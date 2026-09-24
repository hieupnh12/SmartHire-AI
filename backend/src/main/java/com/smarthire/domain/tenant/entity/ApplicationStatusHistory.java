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
@Table(name = "application_status_history")
public class ApplicationStatusHistory {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "application_id", nullable = false)
    Application application;

    @Column(name = "from_status", length = 32) String fromStatus;
    @Column(name = "to_status", nullable = false, length = 32) String toStatus;
    @Column(name = "changed_by") Long changedBy;
    @Column(columnDefinition = "TEXT") String note;
    @Column(name = "created_at", nullable = false, updatable = false) Instant createdAt;

    @PrePersist
    void onCreate() { createdAt = Instant.now(); }
}
