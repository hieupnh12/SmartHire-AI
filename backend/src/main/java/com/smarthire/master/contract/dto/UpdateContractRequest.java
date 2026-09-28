package com.smarthire.master.contract.dto;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UpdateContractRequest {
    String contractNumber;
    String tenantName;
    String tenantTaxCode;
    String tenantAddress;
    String tenantRepresentative;
    String tenantEmail;
    String tenantPhone;
    BigDecimal totalValue;
    String currency;
    String paymentTerms;
    LocalDate validFrom;
    LocalDate validUntil;
    String pdfFileUrl;
    String documentHash;
}
