package com.smarthire.master.lead.dto;

import com.smarthire.domain.master.entity.ConsultationRequest;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ConsultationResponse {

    private Long id;
    private String companyName;
    private String contactName;
    private String jobTitle;
    private String workEmail;
    private String phoneNumber;
    private String companySize;
    private String requestType;
    private String planTier;
    private String primaryNeed;
    private String notes;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static ConsultationResponse from(ConsultationRequest entity) {
        if (entity == null) return null;
        return ConsultationResponse.builder()
                .id(entity.getId())
                .companyName(entity.getCompanyName())
                .contactName(entity.getContactName())
                .jobTitle(entity.getJobTitle())
                .workEmail(entity.getWorkEmail())
                .phoneNumber(entity.getPhoneNumber())
                .companySize(entity.getCompanySize())
                .requestType(entity.getRequestType())
                .planTier(entity.getPlanTier())
                .primaryNeed(entity.getPrimaryNeed())
                .notes(entity.getNotes())
                .status(entity.getStatus())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
