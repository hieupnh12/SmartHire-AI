package com.smarthire.domain.master.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Entity
@Table(name = "tenant_subscriptions")
@Builder
@Data
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class TenantSubscription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @Column(name = "tenant_id", nullable = false)
    Long tenantId;

    @Column(name = "plan_id", nullable = false)
    Long planId;

    @Builder.Default
    String status = "ACTIVE";

    @Builder.Default
    @Column(name = "starts_at", nullable = false)
    LocalDateTime startsAt = LocalDateTime.now();

    @Column(name = "ends_at")
    LocalDateTime endsAt;

    @Builder.Default
    @Column(name = "auto_renew", nullable = false)
    boolean autoRenew = true;

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
