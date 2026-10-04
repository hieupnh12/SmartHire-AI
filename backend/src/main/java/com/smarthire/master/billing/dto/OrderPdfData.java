package com.smarthire.master.billing.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderPdfData {
    private String invoiceNumber;
    private String orderDate;
    private String customerName;
    private String taxCode;
    private String companyLegalName;
    private String billingAddress;
    private String adminEmail;
    private String planName;
    private int quantity;
    private BigDecimal unitPrice;
    private BigDecimal totalPrice;
    private String bankName;
    private String accountNumber;
    private String accountName;
    private String transferSyntax;
    private String qrUrl;
}
