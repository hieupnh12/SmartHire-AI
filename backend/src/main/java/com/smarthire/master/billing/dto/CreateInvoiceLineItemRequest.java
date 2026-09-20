package com.smarthire.master.billing.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Data;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;

@Data
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CreateInvoiceLineItemRequest {

    @NotBlank(message = "Mô tả không được để trống")
    String description;

    @NotNull(message = "Số lượng không được để trống")
    @Min(value = 1, message = "Số lượng phải lớn hơn 0")
    Integer quantity;

    @NotNull(message = "Đơn giá không được để trống")
    BigDecimal unitPrice;

    @NotNull(message = "Loại không được để trống")
    String itemType;
}
