package com.smarthire.domain.master.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Entity
@Table(name = "contracts")
@Builder
@Data
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class Contract {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @Column(name = "contract_number", nullable = false, unique = true)
    String contractNumber;

    @Column(name = "tenant_id", nullable = false)
    Long tenantId;

    @Column(name = "plan_id")
    Long planId;

    @Column(name = "consultation_request_id")
    Long consultationRequestId;

    @Column(nullable = false)
    String title;

    @Column(name = "contract_value", nullable = false)
    BigDecimal contractValue;

    @Builder.Default
    @Column(nullable = false)
    String currency = "USD";

    @Column(name = "start_date", nullable = false)
    LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    LocalDate endDate;

    // --- BÊN A: ĐƠN VỊ CUNG CẤP DỊCH VỤ (SMARTHIRE-AI PLATFORM) ---
    @Builder.Default
    @Column(name = "party_a_name", nullable = false)
    String partyAName = "CÔNG TY CỔ PHẦN CÔNG NGHỆ SMARTHIRE VIỆT NAM";

    @Builder.Default
    @Column(name = "party_a_tax_code", nullable = false)
    String partyATaxCode = "0110889988";

    @Builder.Default
    @Column(name = "party_a_address", nullable = false)
    String partyAAddress = "Tòa nhà Keangnam Landmark 72, Đường Phạm Hùng, Phường Mễ Trì, Quận Nam Từ Liêm, TP. Hà Nội";

    @Builder.Default
    @Column(name = "party_a_representative", nullable = false)
    String partyARepresentative = "Phan Nhật Hưng";

    @Builder.Default
    @Column(name = "party_a_position", nullable = false)
    String partyAPosition = "Tổng Giám Đốc";

    @Builder.Default
    @Column(name = "party_a_phone", nullable = false)
    String partyAPhone = "1900 6868";

    @Builder.Default
    @Column(name = "party_a_email", nullable = false)
    String partyAEmail = "legal@smarthire.top";

    @Builder.Default
    @Column(name = "party_a_bank_name", nullable = false)
    String partyABankName = "Ngân hàng TMCP Kỹ Thương Việt Nam (Techcombank)";

    @Builder.Default
    @Column(name = "party_a_bank_account", nullable = false)
    String partyABankAccount = "190388889999";

    @Builder.Default
    @Column(name = "party_a_bank_branch", nullable = false)
    String partyABankBranch = "Chi nhánh Hà Nội";

    // --- BÊN B: ĐƠN VỊ KHÁCH HÀNG DOANH NGHIỆP ---
    @Column(name = "party_b_name")
    String partyBName;

    @Column(name = "party_b_tax_code")
    String partyBTaxCode;

    @Column(name = "party_b_address")
    String partyBAddress;

    @Column(name = "party_b_representative")
    String partyBRepresentative;

    @Column(name = "party_b_position")
    String partyBPosition;

    @Column(name = "party_b_phone")
    String partyBPhone;

    @Column(name = "party_b_email")
    String partyBEmail;

    @Column(name = "party_b_bank_account")
    String partyBBankAccount;

    // --- THUẾ & GIÁ TRỊ THANH TOÁN THEO LUẬT VIỆT NAM ---
    @Builder.Default
    @Column(name = "tax_rate", nullable = false)
    BigDecimal taxRate = BigDecimal.valueOf(10.00);

    @Builder.Default
    @Column(name = "tax_amount", nullable = false)
    BigDecimal taxAmount = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "total_amount", nullable = false)
    BigDecimal totalAmount = BigDecimal.ZERO;

    @Column(name = "amount_in_words")
    String amountInWords;

    // --- KÝ SỐ ONLINE & BẢO MẬT OTP ---
    @Column(name = "signing_token", unique = true)
    String signingToken;

    @Column(name = "token_expires_at")
    LocalDateTime tokenExpiresAt;

    @Column(name = "sent_at")
    LocalDateTime sentAt;

    @Column(name = "client_ip")
    String clientIp;

    @Builder.Default
    @Column(nullable = false)
    String status = "DRAFT"; // DRAFT, PENDING_SIGNATURE, SIGNED, EXPIRED, TERMINATED

    @Column(name = "sign_method")
    String signMethod; // DIGITAL_TOKEN_CA, E_SIGN_ONLINE, UPLOAD_SIGNED_PDF, MANUAL

    @Column(name = "signed_at")
    LocalDateTime signedAt;

    @Column(name = "signed_document_url")
    String signedDocumentUrl;

    @Column(name = "document_checksum")
    String documentChecksum;

    @Column(name = "terms_and_conditions", columnDefinition = "TEXT")
    String termsAndConditions;

    @Column(columnDefinition = "TEXT")
    String notes;

    @Builder.Default
    @Column(name = "created_at", updatable = false)
    LocalDateTime createdAt = LocalDateTime.now();

    @Builder.Default
    @Column(name = "updated_at")
    LocalDateTime updatedAt = LocalDateTime.now();

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (updatedAt == null) updatedAt = LocalDateTime.now();
    }


    void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
