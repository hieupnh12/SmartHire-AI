package com.smarthire.domain.tenant.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "company_email_settings")
public class CompanyEmailSetting extends BaseEntity {

    @Column(nullable = false, length = 32)
    @Builder.Default
    String provider = "GMAIL";

    @Column(name = "mail_username", nullable = false, length = 255)
    String mailUsername;

    @Column(name = "mail_password_encrypted", nullable = false, length = 512)
    String mailPasswordEncrypted;

    @Column(name = "from_name", length = 128)
    String fromName;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    Boolean isActive = true;
}
