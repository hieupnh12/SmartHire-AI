package com.smarthire.domain.tenant.entity;

import com.smarthire.domain.enums.InvitationStatus;
import jakarta.persistence.*;
import java.time.Instant;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "member_invitations")
public class MemberInvitation extends BaseEntity {

    @Column(nullable = false) String email;

    @Column(name = "full_name", nullable = false) String fullName;

    @Column(nullable = false, length = 64) String role;

    @Column(name = "token_hash", nullable = false, unique = true, length = 64) String tokenHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32) InvitationStatus status = InvitationStatus.PENDING;

    @Column(name = "expires_at", nullable = false) Instant expiresAt;
}
