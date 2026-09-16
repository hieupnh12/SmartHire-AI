package com.smarthire.tenant.auth.dto;

import com.smarthire.domain.tenant.entity.User;
import com.smarthire.domain.tenant.entity.UserProfile;
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
public class CandidateProfileResponse {
    private Long id;
    private String email;
    private String fullName;
    private String avatarUrl;
    private String role;
    private String headline;
    private String status;

    public static CandidateProfileResponse fromEntity(User user, UserProfile profile) {
        if (user == null) {
            return null;
        }
        return CandidateProfileResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .avatarUrl(profile != null ? profile.getAvatarUrl() : null)
                .role(user.getRole() != null ? user.getRole().name() : "CANDIDATE")
                .headline(profile != null ? profile.getHeadline() : null)
                .status(user.getStatus() != null ? user.getStatus().name() : "ACTIVE")
                .build();
    }
}
