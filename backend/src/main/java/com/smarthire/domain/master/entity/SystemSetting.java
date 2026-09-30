package com.smarthire.domain.master.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Entity
@Table(name = "system_settings")
@Builder
@Data
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class SystemSetting {

    @Id
    @Column(name = "setting_key", nullable = false, length = 100)
    String settingKey;

    @Column(name = "setting_value", nullable = false, columnDefinition = "TEXT")
    String settingValue;

    @Builder.Default
    @Column(nullable = false, length = 50)
    String category = "GENERAL";

    @Column(length = 255)
    String description;

    @Builder.Default
    @Column(name = "is_encrypted", nullable = false)
    Boolean isEncrypted = false;

    @Column(name = "updated_by", length = 100)
    String updatedBy;

    @Builder.Default
    @Column(name = "updated_at", nullable = false)
    LocalDateTime updatedAt = LocalDateTime.now();

    @PrePersist
    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
