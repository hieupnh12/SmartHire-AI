package com.smarthire.master.contract.dto;

import com.smarthire.domain.master.entity.ContractSignature;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Data;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

@Data
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ContractSignatureResponse {

    Long id;
    String signerName;
    String signerEmail;
    String signerTitle;
    String status;
    LocalDateTime signedAt;
    String clientIp;

    public static ContractSignatureResponse from(ContractSignature signature) {
        if (signature == null) return null;
        return ContractSignatureResponse.builder()
                .id(signature.getId())
                .signerName(signature.getSignerName())
                .signerEmail(signature.getSignerEmail())
                .signerTitle(signature.getSignerTitle())
                .status(signature.getStatus())
                .signedAt(signature.getSignedAt())
                .clientIp(signature.getClientIp())
                .build();
    }
}
