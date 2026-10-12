package com.smarthire.domain.tenant.entity;

import com.smarthire.domain.enums.UserStatus;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "users")
public class User extends BaseEntity {

    @Column(nullable = false, unique = true) String email;

    @Column(name = "password_hash") String passwordHash;

    @Column(name = "full_name", nullable = false) String fullName;

    @Column(length = 32) String phone;

    @Column(name = "avatar_url", length = 512) String avatarUrl;

    @Column(name = "job_title", length = 128) String jobTitle;

    @Column(nullable = false, length = 64) String role;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32) UserStatus status = UserStatus.ACTIVE;
}
