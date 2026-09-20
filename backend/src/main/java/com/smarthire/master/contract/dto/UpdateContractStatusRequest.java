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
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
