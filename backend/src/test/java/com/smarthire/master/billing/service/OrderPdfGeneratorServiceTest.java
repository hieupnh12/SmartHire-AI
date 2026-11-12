package com.smarthire.master.billing.service;

import com.lowagie.text.pdf.PdfReader;
import com.lowagie.text.pdf.parser.PdfTextExtractor;
import com.smarthire.master.billing.dto.OrderPdfData;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class OrderPdfGeneratorServiceTest {

    private final OrderPdfGeneratorService generator = new OrderPdfGeneratorService();

    @Test
    void generatesValidOrderPdfWithVietnameseText() throws Exception {
        OrderPdfData data = OrderPdfData.builder()
                .invoiceNumber("INV-202610-0001")
                .orderDate("02/10/2026")
                .customerName("CÔNG TY TNHH CÔNG NGHỆ ALPHA")
                .taxCode("0101234567")
                .companyLegalName("CÔNG TY TNHH CÔNG NGHỆ ALPHA")
                .billingAddress("Tầng 13, Tòa nhà FPT, Quận Ngũ Hành Sơn, TP. Đà Nẵng")
                .adminEmail("admin@alpha.vn")
                .planName("Gói Chuyên Nghiệp (Professional)")
                .quantity(1)
                .unitPrice(new BigDecimal("36000000"))
                .totalPrice(new BigDecimal("36000000"))
                .bankName("Ngân hàng TMCP Tiên Phong (TPBank)")
                .bankBranch("Chi nhánh Đà Nẵng")
                .accountNumber("07744348801")
                .accountName("NGUYEN NHAT SINH")
                .transferSyntax("SH INV-202610-0001")
                .qrUrl("")
                .termsVersion("v2026.10")
                .termsAcceptedAt("09/10/2026 20:55:00")
                .clientIp("203.113.152.10")
                .build();

        byte[] pdfBytes = generator.generateOrderPdf(data);

        assertThat(pdfBytes).isNotNull();
        assertThat(pdfBytes.length).isGreaterThan(1000);
        // Standard PDF signature "%PDF-"
        assertThat(new String(pdfBytes, 0, 5)).isEqualTo("%PDF-");

        try (PdfReader reader = new PdfReader(pdfBytes)) {
            PdfTextExtractor extractor = new PdfTextExtractor(reader);
            StringBuilder fullText = new StringBuilder();
            for (int page = 1; page <= reader.getNumberOfPages(); page++) {
                fullText.append(extractor.getTextFromPage(page)).append("\n");
            }
            String text = fullText.toString();
            assertThat(text).contains("0110888999");
            assertThat(text).contains("ĐÀ NẴNG");
            assertThat(text).contains("Chi nhánh Đà Nẵng");
            assertThat(text).contains("07744348801");
            assertThat(text).contains("Luật Bảo vệ dữ liệu cá nhân 2025");
            assertThat(text).doesNotContain("0110889988");
            assertThat(text).doesNotContain("Keangnam");
            assertThat(text).doesNotContain("13/2023");
        }
    }
}
