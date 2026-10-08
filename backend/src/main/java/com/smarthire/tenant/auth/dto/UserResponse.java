package com.smarthire.tenant.auth.dto;

import com.smarthire.domain.enums.UserRole;
import com.smarthire.domain.tenant.entity.Candidate;
import com.smarthire.domain.tenant.entity.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserResponse {
    private Long id;
    private String email;
    private String fullName;
    private String phone;
    private String avatarUrl;
    private String headline;
    private String bio;
    private String role;
    private String workspace;
    private String status;
    private Instant createdAt;
    private List<String> permissions;
    /** True for tenant/company admins viewing the recruiter workspace in read-only mode. */
    private boolean recruiterReadOnly;

    public static UserResponse fromEntity(User user) {
        if (user == null) {
            return null;
        }
        return UserResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .phone(user.getPhone())
                .avatarUrl(user.getAvatarUrl())
                .role(user.getRole())
                .workspace(user.getRole() != null ? UserRole.workspaceOf(user.getRole()) : null)
                .status(user.getStatus() != null ? user.getStatus().name() : null)
                .createdAt(user.getCreatedAt())
                .build();
    }

    public static UserResponse fromCandidate(Candidate candidate) {
        if (candidate == null) {
            return null;
        }
        return UserResponse.builder()
                .id(candidate.getId())
                .email(candidate.getEmail())
                .fullName(candidate.getFullName())
                .phone(candidate.getPhone())
                .avatarUrl(candidate.getAvatarUrl())
                .headline(candidate.getHeadline())
                .bio(candidate.getBio())
                .role(UserRole.CANDIDATE.name())
                .workspace(UserRole.workspaceOf(UserRole.CANDIDATE.name()))
                .status(candidate.getStatus() != null ? candidate.getStatus().name() : null)
                .createdAt(candidate.getCreatedAt())
                .permissions(List.of())
                .recruiterReadOnly(false)
                .build();
    }
}

