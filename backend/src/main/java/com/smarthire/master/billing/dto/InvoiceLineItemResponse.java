package com.smarthire.master.billing.dto;

import com.smarthire.domain.master.entity.InvoiceLineItem;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Data;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;

@Data
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class InvoiceLineItemResponse {

    Long id;
    String description;
    Integer quantity;
    BigDecimal unitPrice;
    BigDecimal totalPrice;
    String itemType;

    public static InvoiceLineItemResponse from(InvoiceLineItem item) {
        if (item == null) return null;
        return InvoiceLineItemResponse.builder()
                .id(item.getId())
                .description(item.getDescription())
                .quantity(item.getQuantity())
                .unitPrice(item.getUnitPrice())
                .totalPrice(item.getTotalPrice())
                .itemType(item.getItemType())
                .build();
    }
}
