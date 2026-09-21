package com.smarthire.domain.master.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Entity
@Table(name = "invoice_line_items")
@Builder
@Data
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class InvoiceLineItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @Column(name = "invoice_id", nullable = false)
    Long invoiceId;

    @Column(nullable = false)
    String description;

    @Builder.Default
    @Column(nullable = false)
    Integer quantity = 1;

    @Column(name = "unit_price", nullable = false)
    BigDecimal unitPrice;

    @Column(name = "total_price", nullable = false)
    BigDecimal totalPrice;

    @Builder.Default
    @Column(name = "item_type", nullable = false, length = 64)
    String itemType = "BASE_PLAN";
}
