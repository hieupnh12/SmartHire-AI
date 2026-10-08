package com.smarthire.tenant.auth.dto;

import com.smarthire.domain.tenant.entity.Candidate;
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

    public static CandidateProfileResponse fromEntity(Candidate candidate) {
        if (candidate == null) {
            return null;
        }
        return CandidateProfileResponse.builder()
                .id(candidate.getId())
                .email(candidate.getEmail())
                .fullName(candidate.getFullName())
                .avatarUrl(candidate.getAvatarUrl())
                .role("CANDIDATE")
                .headline(candidate.getHeadline())
                .status(candidate.getStatus() != null ? candidate.getStatus().name() : "ACTIVE")
                .build();
    }
}
