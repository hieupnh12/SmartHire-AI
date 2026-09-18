package com.smarthire.domain.master.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

@Entity
@Table(name = "consultation_requests")
@Builder
@Data
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ConsultationRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @Column(name = "company_name", nullable = false)
    String companyName;

    @Column(name = "contact_name", nullable = false)
    String contactName;

    @Column(name = "job_title")
    String jobTitle;

    @Column(name = "work_email", nullable = false)
    String workEmail;

    @Column(name = "phone_number")
    String phoneNumber;

    @Column(name = "company_size")
    String companySize;

    @Builder.Default
    @Column(name = "request_type", nullable = false, length = 64)
    String requestType = "DEMO"; // "DEMO" or "CONTRACT_QUOTE"

    @Column(name = "plan_tier")
    String planTier;

    @Column(name = "primary_need", columnDefinition = "TEXT")
    String primaryNeed;

    @Column(name = "notes", columnDefinition = "TEXT")
    String notes;

    @Builder.Default
    @Column(nullable = false, length = 32)
    String status = "PENDING"; // "PENDING", "CONTACTED", "PROVISIONED", "REJECTED"

    @Builder.Default
    @Column(name = "created_at", nullable = false, updatable = false)
    LocalDateTime createdAt = LocalDateTime.now();

    @Builder.Default
    @Column(name = "updated_at", nullable = false)
    LocalDateTime updatedAt = LocalDateTime.now();

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
