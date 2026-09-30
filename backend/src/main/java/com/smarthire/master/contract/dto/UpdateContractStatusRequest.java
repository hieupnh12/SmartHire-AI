package com.smarthire.master.contract.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateContractStatusRequest {

    @NotBlank(message = "Trạng thái hợp đồng không được để trống")
    private String status; // DRAFT, PENDING_SIGNATURE, SIGNED, EXPIRED, TERMINATED

    private String notes;
    
}
