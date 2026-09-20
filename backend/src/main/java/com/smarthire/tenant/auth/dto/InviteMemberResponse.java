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
public class InviteMemberResponse {
    private String email;
    private String fullName;
    private String role;
    private Instant expiresAt;
    private boolean emailSent;
    private String acceptUrl;
}
