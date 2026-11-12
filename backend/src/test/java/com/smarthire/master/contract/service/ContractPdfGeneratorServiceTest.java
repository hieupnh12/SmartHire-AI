package com.smarthire.master.contract.service;

import com.lowagie.text.pdf.PdfReader;
import com.lowagie.text.pdf.parser.PdfTextExtractor;
import com.smarthire.config.PlatformProperties;
import com.smarthire.domain.master.entity.Contract;
import com.smarthire.domain.master.entity.SubscriptionPlan;
import com.smarthire.domain.master.entity.TenantInfo;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

class ContractPdfGeneratorServiceTest {

    private final ContractPdfGeneratorService generator = new ContractPdfGeneratorService(new PlatformProperties());

    @Test
    void generateContractPdf_usesDaNangLegalTpBankLaw2025AndAccurateQuotas() throws Exception {
        Contract contract = Contract.builder()
                .id(1L)
                .contractNumber("CTR-202611-0001")
                .title("Hợp đồng cung cấp dịch vụ SmartHire-AI")
                .contractValue(new BigDecimal("36000000"))
                .totalAmount(new BigDecimal("36000000"))
                .currency("VND")
                .startDate(LocalDate.of(2026, 11, 1))
                .endDate(LocalDate.of(2027, 11, 1))
                .partyBName("CÔNG TY TNHH ĐỐI TÁC B2B")
                .partyBTaxCode("0401234567")
                .partyBRepresentative("Lê Văn A")
                .partyBPosition("Giám Đốc")
                .partyBEmail("partner@example.vn")
                .createdAt(LocalDateTime.of(2026, 11, 1, 9, 0))
                .build();

        SubscriptionPlan plan = SubscriptionPlan.builder()
                .name("Professional")
                .maxJobs(-1)
                .maxCvParses(2500)
                .maxAiInterviewHours(30)
                .maxProctoringHours(0)
                .maxStorageGb(100)
                .build();

        TenantInfo tenant = TenantInfo.builder()
                .code("partner_b2b")
                .subdomain("partnerb2b")
                .build();

        byte[] pdfBytes = generator.generateContractPdf(contract, plan, tenant);
        assertThat(pdfBytes).isNotEmpty();

        StringBuilder fullText = new StringBuilder();
        try (PdfReader reader = new PdfReader(pdfBytes)) {
            PdfTextExtractor extractor = new PdfTextExtractor(reader);
            for (int page = 1; page <= reader.getNumberOfPages(); page++) {
                fullText.append(extractor.getTextFromPage(page)).append("\n");
            }
        }
        String text = fullText.toString();

        assertThat(text).contains("Đà Nẵng");
        assertThat(text).contains("0110888999");
        assertThat(text).contains("0988.888.888");
        assertThat(text).contains("support@smarthire.top");
        assertThat(text).contains("TPBank");
        assertThat(text).contains("07744348801");
        assertThat(text).contains("Chi nhánh Đà Nẵng");
        assertThat(text).contains("Luật Bảo vệ dữ liệu cá nhân 2025 & Nghị định số 356/2025/NĐ-CP");
        assertThat(text).contains("Thành phố Đà Nẵng");

        assertThat(text).contains("Không giới hạn");
        assertThat(text).contains("2.500 hồ sơ/tháng");
        assertThat(text).contains("30 giờ/tháng");
        assertThat(text).contains("Không hỗ trợ");
        assertThat(text).contains("100 GB");

        assertThat(text).doesNotContain("13/2023");
        assertThat(text).doesNotContain("Keangnam");
        assertThat(text).doesNotContain("Techcombank");
        assertThat(text).doesNotContain("0110889988");
    }
}
