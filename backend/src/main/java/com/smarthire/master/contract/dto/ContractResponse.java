package com.smarthire.master.contract.dto;

import com.smarthire.domain.master.entity.Contract;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ContractResponse {

    private Long id;
    private String contractNumber;
    private Long tenantId;
    private String tenantName;
    private String tenantCode;
    private String tenantSubdomain;
    private Long planId;
    private String planName;
    private String planCode;
    private Long consultationRequestId;
    private String title;
    private BigDecimal contractValue;
    private String currency;
    private LocalDate startDate;
    private LocalDate endDate;
    // Party A
    private String partyAName;
    private String partyATaxCode;
    private String partyAAddress;
    private String partyARepresentative;
    private String partyAPosition;
    private String partyAPhone;
    private String partyAEmail;
    private String partyABankName;
    private String partyABankAccount;
    private String partyABankBranch;

    // Party B
    private String partyBName;
    private String partyBTaxCode;
    private String partyBAddress;
    private String partyBRepresentative;
    private String partyBPosition;
    private String partyBPhone;
    private String partyBEmail;
    private String partyBBankAccount;

    // Tax & Totals
    private BigDecimal taxRate;
    private BigDecimal taxAmount;
    private BigDecimal totalAmount;
    private String amountInWords;

    // Public Signing & Security
    private String signingToken;
    private LocalDateTime tokenExpiresAt;
    private LocalDateTime sentAt;
    private String clientIp;

    private String status;
    private String signMethod;
    private LocalDateTime signedAt;
    private String signedDocumentUrl;
    private String documentChecksum;
    private String termsAndConditions;
    private String notes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    private List<ContractSignatureResponse> signatures;

    public static ContractResponse from(Contract contract) {
        if (contract == null) return null;
        return ContractResponse.builder()
                .id(contract.getId())
                .contractNumber(contract.getContractNumber())
                .tenantId(contract.getTenantId())
                .planId(contract.getPlanId())
                .consultationRequestId(contract.getConsultationRequestId())
                .title(contract.getTitle())
                .contractValue(contract.getContractValue())
                .currency(contract.getCurrency())
                .startDate(contract.getStartDate())
                .endDate(contract.getEndDate())
                .partyAName(contract.getPartyAName())
                .partyATaxCode(contract.getPartyATaxCode())
                .partyAAddress(contract.getPartyAAddress())
                .partyARepresentative(contract.getPartyARepresentative())
                .partyAPosition(contract.getPartyAPosition())
                .partyAPhone(contract.getPartyAPhone())
                .partyAEmail(contract.getPartyAEmail())
                .partyABankName(contract.getPartyABankName())
                .partyABankAccount(contract.getPartyABankAccount())
                .partyABankBranch(contract.getPartyABankBranch())
                .partyBName(contract.getPartyBName())
                .partyBTaxCode(contract.getPartyBTaxCode())
                .partyBAddress(contract.getPartyBAddress())
                .partyBRepresentative(contract.getPartyBRepresentative())
                .partyBPosition(contract.getPartyBPosition())
                .partyBPhone(contract.getPartyBPhone())
                .partyBEmail(contract.getPartyBEmail())
                .partyBBankAccount(contract.getPartyBBankAccount())
                .taxRate(contract.getTaxRate())
                .taxAmount(contract.getTaxAmount())
                .totalAmount(contract.getTotalAmount())
                .amountInWords(contract.getAmountInWords())
                .signingToken(contract.getSigningToken())
                .tokenExpiresAt(contract.getTokenExpiresAt())
                .sentAt(contract.getSentAt())
                .clientIp(contract.getClientIp())
                .status(contract.getStatus())
                .signMethod(contract.getSignMethod())
                .signedAt(contract.getSignedAt())
                .signedDocumentUrl(contract.getSignedDocumentUrl())
                .documentChecksum(contract.getDocumentChecksum())
                .termsAndConditions(contract.getTermsAndConditions())
                .notes(contract.getNotes())
                .createdAt(contract.getCreatedAt())
                .updatedAt(contract.getUpdatedAt())
                .signatures(java.util.Collections.emptyList()) // Populated in service
                .build();
    }
}
