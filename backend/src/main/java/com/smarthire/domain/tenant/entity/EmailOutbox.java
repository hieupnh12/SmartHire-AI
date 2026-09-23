package com.smarthire.domain.tenant.entity;

import com.smarthire.domain.enums.NotificationStatus;
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
@Table(name = "email_outbox")
public class EmailOutbox {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;

    @Column(name = "to_email", nullable = false) String toEmail;
    @Column(nullable = false) String subject;
    @Column(nullable = false, columnDefinition = "TEXT") String body;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    NotificationStatus status = NotificationStatus.PENDING;

    @Column(nullable = false) int attempts;
    @Column(name = "created_at", nullable = false, updatable = false) Instant createdAt;
    @Column(name = "sent_at") Instant sentAt;

    @PrePersist
    void onCreate() { createdAt = Instant.now(); }
}
