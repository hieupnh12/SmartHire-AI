package com.smarthire.tenant.auth.dto;

import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PendingInvitationResponse {
    private Long id;
    private String email;
    private String fullName;
    private String role;
    private String status;
    private boolean expired;
    private Instant expiresAt;
    private Instant createdAt;
}

