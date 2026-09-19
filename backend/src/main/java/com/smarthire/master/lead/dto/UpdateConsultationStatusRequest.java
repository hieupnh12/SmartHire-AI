package com.smarthire.master.lead.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class UpdateConsultationStatusRequest {

    @NotBlank(message = "Trạng thái không được để trống")
    private String status; // "PENDING", "CONTACTED", "PROVISIONED", "REJECTED"

    private String notes;
}
