package com.smarthire.domain.tenant.entity;

import com.smarthire.domain.enums.UserStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "candidates")
public class Candidate extends BaseEntity {

    @Column(nullable = false, unique = true)
    String email;

    @Column(name = "password_hash")
    String passwordHash;

    @Column(name = "full_name", nullable = false)
    String fullName;

    @Column(length = 32)
    String phone;

    @Column(name = "avatar_url", length = 512)
    String avatarUrl;

    String headline;

    @Column(columnDefinition = "TEXT")
    String bio;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "links_json", columnDefinition = "json")
    String linksJson;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    UserStatus status = UserStatus.ACTIVE;
}
