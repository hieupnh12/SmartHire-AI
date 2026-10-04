package com.smarthire.master.billing.service;

import com.smarthire.master.billing.dto.OrderPdfData;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class OrderPdfGeneratorServiceTest {

    private final OrderPdfGeneratorService generator = new OrderPdfGeneratorService();

    @Test
    void generatesValidOrderPdfWithVietnameseText() {
        OrderPdfData data = OrderPdfData.builder()
                .invoiceNumber("INV-202610-0001")
                .orderDate("02/10/2026")
                .customerName("CÔNG TY TNHH CÔNG NGHỆ ALPHA")
                .taxCode("0101234567")
                .companyLegalName("CÔNG TY TNHH CÔNG NGHỆ ALPHA")
                .billingAddress("Số 123 Phố Duy Tân, Cầu Giấy, Hà Nội")
                .adminEmail("admin@alpha.vn")
                .planName("Gói Chuyên Nghiệp (Professional)")
                .quantity(1)
                .unitPrice(new BigDecimal("36000000"))
                .totalPrice(new BigDecimal("36000000"))
                .bankName("Ngân hàng TMCP Tiên Phong (TPBank)")
                .accountNumber("07744348801")
                .accountName("NGUYEN NHAT SINH")
                .transferSyntax("SH INV-202610-0001")
                .qrUrl("https://img.vietqr.io/image/TPBank-07744348801-compact2.png?amount=36000000&addInfo=SH%20INV-202610-0001&accountName=NGUYEN%20NHAT%20SINH")
                .build();

        byte[] pdfBytes = generator.generateOrderPdf(data);

        assertThat(pdfBytes).isNotNull();
        assertThat(pdfBytes.length).isGreaterThan(1000);
        // Standard PDF signature "%PDF-"
        assertThat(new String(pdfBytes, 0, 5)).isEqualTo("%PDF-");
    }
}
