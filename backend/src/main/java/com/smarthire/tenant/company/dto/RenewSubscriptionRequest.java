package com.smarthire.tenant.company.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class RenewSubscriptionRequest {

    @Builder.Default
    @NotNull(message = "Số năm gia hạn không được để trống")
    @Min(value = 1, message = "Thời hạn gia hạn tối thiểu là 1 năm")
    @Max(value = 5, message = "Thời hạn gia hạn tối đa là 5 năm mỗi lần")
    Integer years = 1;

    String notes;
}
