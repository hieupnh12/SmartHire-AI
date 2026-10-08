package com.smarthire.domain.tenant.entity;

import com.smarthire.domain.enums.NotificationCategory;
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
@Table(name = "notification_preferences")
public class NotificationPreference {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "candidate_id")
    Candidate candidate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    NotificationCategory category;

    @Builder.Default
    @Column(name = "web_enabled", nullable = false)
    boolean webEnabled = true;

    @Builder.Default
    @Column(name = "email_enabled", nullable = false)
    boolean emailEnabled = true;

    @Column(name = "updated_at", nullable = false)
    Instant updatedAt;

    @PrePersist
    @PreUpdate
    void touch() { updatedAt = Instant.now(); }
}
