package com.smarthire.tenant.auth.dto;

import com.smarthire.domain.tenant.entity.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserResponse {
    private Long id;
    private String email;
    private String fullName;
    private String role;
    private String status;
    private Instant createdAt;

    public static UserResponse fromEntity(User user) {
        if (user == null) {
            return null;
        }
        return UserResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .role(user.getRole() != null ? user.getRole().name() : null)
                .status(user.getStatus() != null ? user.getStatus().name() : null)
                .createdAt(user.getCreatedAt())
                .build();
    }
}

