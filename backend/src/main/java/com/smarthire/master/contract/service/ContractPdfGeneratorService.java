package com.smarthire.master.contract.service;

import com.lowagie.text.*;
import com.lowagie.text.pdf.*;
import com.smarthire.domain.master.entity.Contract;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.math.BigDecimal;
import java.security.MessageDigest;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HexFormat;
import java.util.Locale;

@Slf4j
@Service
public class ContractPdfGeneratorService {

    public byte[] generateContractPdf(Contract contract, String planName, String tenantCode) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            BaseFont baseRegular = loadBaseFont(false);
            BaseFont baseBold = loadBaseFont(true);

            Document document = new Document(PageSize.A4, 42, 42, 40, 40);
            PdfWriter.getInstance(document, out);
            document.open();

            Font fontNationalTitle = new Font(baseBold, 11, Font.NORMAL, Color.BLACK);
            Font fontNationalSub = new Font(baseBold, 10.5f, Font.UNDERLINE, Color.BLACK);
            Font fontDate = new Font(baseRegular, 9.5f, Font.ITALIC, new Color(71, 85, 105));
            Font fontContractTitle = new Font(baseBold, 14, Font.NORMAL, new Color(15, 23, 42));
            Font fontContractSubTitle = new Font(baseBold, 11.5f, Font.NORMAL, new Color(30, 58, 138));
            Font fontContractNo = new Font(baseBold, 10, Font.NORMAL, new Color(30, 41, 59));
            Font fontLegalBasis = new Font(baseRegular, 9.5f, Font.ITALIC, new Color(51, 65, 85));
            Font fontSectionTitle = new Font(baseBold, 10.5f, Font.NORMAL, new Color(15, 23, 42));
            Font fontBody = new Font(baseRegular, 10, Font.NORMAL, new Color(15, 23, 42));
            Font fontBodyBold = new Font(baseBold, 10, Font.NORMAL, new Color(15, 23, 42));
            Font fontSmall = new Font(baseRegular, 8.5f, Font.NORMAL, new Color(100, 116, 139));

            LocalDateTime createdAt = contract.getCreatedAt() != null ? contract.getCreatedAt() : LocalDateTime.now();

            // 1. Quốc hiệu & Tiêu ngữ
            Paragraph nationalHeader = new Paragraph("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", fontNationalTitle);
            nationalHeader.setAlignment(Element.ALIGN_CENTER);
            document.add(nationalHeader);

            Paragraph nationalMotto = new Paragraph("Độc lập - Tự do - Hạnh phúc", fontNationalSub);
            nationalMotto.setAlignment(Element.ALIGN_CENTER);
            nationalMotto.setSpacingAfter(6f);
            document.add(nationalMotto);

            Paragraph dateLine = new Paragraph(
                    String.format("Hà Nội, ngày %02d tháng %02d năm %d",
                            createdAt.getDayOfMonth(), createdAt.getMonthValue(), createdAt.getYear()),
                    fontDate);
            dateLine.setAlignment(Element.ALIGN_RIGHT);
            dateLine.setSpacingAfter(12f);
            document.add(dateLine);

            // 2. Tiêu đề Hợp đồng
            Paragraph title = new Paragraph("HỢP ĐỒNG CUNG CẤP DỊCH VỤ PHẦN MỀM TUYỂN DỤNG AI", fontContractTitle);
            title.setAlignment(Element.ALIGN_CENTER);
            document.add(title);

            Paragraph subTitle = new Paragraph("& HẠ TẦNG CƠ SỞ DỮ LIỆU ĐỘC LẬP (DEDICATED DATABASE)", fontContractSubTitle);
            subTitle.setAlignment(Element.ALIGN_CENTER);
            subTitle.setSpacingAfter(4f);
            document.add(subTitle);

            Paragraph contractNo = new Paragraph(
                    "Số: " + safe(contract.getContractNumber(), "CTR-B2B") + "/HĐDV-SMARTHIRE",
                    fontContractNo);
            contractNo.setAlignment(Element.ALIGN_CENTER);
            contractNo.setSpacingAfter(12f);
            document.add(contractNo);

            // 3. Căn cứ pháp lý
            Paragraph basis1 = new Paragraph("• Căn cứ Bộ luật Dân sự số 91/2015/QH13 ngày 24/11/2015 của Quốc hội nước CHXHCN Việt Nam;", fontLegalBasis);
            Paragraph basis2 = new Paragraph("• Căn cứ Luật Giao dịch điện tử số 20/2023/QH15 ngày 22/06/2023 quy định về thông điệp dữ liệu và chữ ký điện tử;", fontLegalBasis);
            Paragraph basis3 = new Paragraph("• Căn cứ Nghị định số 13/2023/NĐ-CP ngày 17/04/2023 của Chính phủ về Bảo vệ dữ liệu cá nhân;", fontLegalBasis);
            Paragraph basis4 = new Paragraph("• Căn cứ vào nhu cầu và năng lực thực tế của hai bên.", fontLegalBasis);
            basis4.setSpacingAfter(10f);
            document.add(basis1);
            document.add(basis2);
            document.add(basis3);
            document.add(basis4);

            // 4. Thông tin hai bên
            Paragraph partyAHeader = new Paragraph("BÊN A: BÊN CUNG CẤP DỊCH VỤ (NHÀ PHÁT TRIỂN NỀN TẢNG)", fontSectionTitle);
            partyAHeader.setSpacingAfter(4f);
            document.add(partyAHeader);

            addKeyValueLine(document, "Tên doanh nghiệp: ", safe(contract.getPartyAName(), "CÔNG TY CỔ PHẦN CÔNG NGHỆ SMARTHIRE VIỆT NAM"), fontBody, fontBodyBold);
            addKeyValueLine(document, "Mã số thuế: ", safe(contract.getPartyATaxCode(), "0110889988"), fontBody, fontBodyBold);
            addKeyValueLine(document, "Địa chỉ trụ sở: ", safe(contract.getPartyAAddress(), "Tòa nhà Keangnam Landmark 72, Đường Phạm Hùng, Nam Từ Liêm, Hà Nội"), fontBody, fontBody);
            addKeyValueLine(document, "Người đại diện: ", safe(contract.getPartyARepresentative(), "Phan Nhật Hưng") + " — Chức vụ: " + safe(contract.getPartyAPosition(), "Tổng Giám Đốc"), fontBody, fontBodyBold);
            addKeyValueLine(document, "Email pháp chế: ", safe(contract.getPartyAEmail(), "legal@smarthire.top") + " — Điện thoại: " + safe(contract.getPartyAPhone(), "1900 6868"), fontBody, fontBody);
            addKeyValueLine(document, "Tài khoản ngân hàng: ", safe(contract.getPartyABankAccount(), "190388889999") + " tại " + safe(contract.getPartyABankName(), "Techcombank"), fontBody, fontBody);

            Paragraph partyBHeader = new Paragraph("BÊN B: BÊN SỬ DỤNG DỊCH VỤ (KHÁCH HÀNG DOANH NGHIỆP)", fontSectionTitle);
            partyBHeader.setSpacingBefore(8f);
            partyBHeader.setSpacingAfter(4f);
            document.add(partyBHeader);

            addKeyValueLine(document, "Tên doanh nghiệp: ", safe(contract.getPartyBName(), "Doanh nghiệp khách hàng"), fontBody, fontBodyBold);
            addKeyValueLine(document, "Mã số thuế: ", safe(contract.getPartyBTaxCode(), "Theo ĐKKD"), fontBody, fontBodyBold);
            addKeyValueLine(document, "Địa chỉ trụ sở: ", safe(contract.getPartyBAddress(), "Theo Giấy chứng nhận ĐKKD"), fontBody, fontBody);
            addKeyValueLine(document, "Người đại diện ký kết: ", safe(contract.getPartyBRepresentative(), "Đại diện theo pháp luật") + " — Chức vụ: " + safe(contract.getPartyBPosition(), "Giám Đốc"), fontBody, fontBodyBold);
            addKeyValueLine(document, "Email nhận & ký hợp đồng: ", safe(contract.getPartyBEmail(), "") + " — Điện thoại: " + safe(contract.getPartyBPhone(), "—"), fontBody, fontBodyBold);

            // 5. Các điều khoản hợp đồng
            Paragraph art1 = new Paragraph("ĐIỀU 1: ĐỐI TƯỢNG VÀ PHẠM VI DỊCH VỤ", fontSectionTitle);
            art1.setSpacingBefore(10f);
            art1.setSpacingAfter(4f);
            document.add(art1);

            Paragraph art1Body1 = new Paragraph(
                    "1.1. Bên A cung cấp cho Bên B quyền truy cập và sử dụng nền tảng tuyển dụng thông minh SmartHire-AI ("
                            + safe(contract.getTitle(), "Gói Doanh Nghiệp") + " - Gói: " + safe(planName, "Enterprise B2B") + ").",
                    fontBody);
            Paragraph art1Body2 = new Paragraph(
                    "1.2. Kiến trúc Separate Database per Tenant: Bên A cấp phát cơ sở dữ liệu vật lý độc lập (smarthire_tenant_"
                            + safe(tenantCode, "enterprise") + ") dành riêng cho Bên B, đảm bảo cách ly hoàn toàn dữ liệu tuyển dụng.",
                    fontBody);
            Paragraph art1Body3 = new Paragraph(
                    "1.3. Thời hạn hiệu lực hợp đồng: Từ ngày " + safe(String.valueOf(contract.getStartDate()), "—")
                            + " đến hết ngày " + safe(String.valueOf(contract.getEndDate()), "—") + ".",
                    fontBody);
            art1Body3.setSpacingAfter(8f);
            document.add(art1Body1);
            document.add(art1Body2);
            document.add(art1Body3);

            Paragraph art2 = new Paragraph("ĐIỀU 2: GIÁ TRỊ HỢP ĐỒNG VÀ PHƯƠNG THỨC THANH TOÁN", fontSectionTitle);
            art2.setSpacingAfter(6f);
            document.add(art2);

            String currency = safe(contract.getCurrency(), "VND");
            BigDecimal value = contract.getContractValue() != null ? contract.getContractValue() : BigDecimal.ZERO;
            BigDecimal taxRate = contract.getTaxRate() != null ? contract.getTaxRate() : BigDecimal.valueOf(10);
            BigDecimal taxAmount = contract.getTaxAmount() != null ? contract.getTaxAmount() : BigDecimal.ZERO;
            BigDecimal totalAmount = contract.getTotalAmount() != null && contract.getTotalAmount().compareTo(BigDecimal.ZERO) > 0
                    ? contract.getTotalAmount()
                    : value.add(taxAmount);

            PdfPTable priceTable = new PdfPTable(2);
            priceTable.setWidthPercentage(100);
            priceTable.setWidths(new float[]{65f, 35f});
            addTableRow(priceTable, "Giá trị dịch vụ trước thuế:", formatMoney(value, currency), fontBody, fontBodyBold);
            addTableRow(priceTable, "Thuế Giá trị gia tăng (VAT " + taxRate + "%):", formatMoney(taxAmount, currency), fontBody, fontBody);
            addTableRow(priceTable, "TỔNG GIÁ TRỊ THANH TOÁN:", formatMoney(totalAmount, currency), fontBodyBold, fontBodyBold);
            priceTable.setSpacingAfter(4f);
            document.add(priceTable);

            Paragraph inWords = new Paragraph("Bằng chữ: " + safe(contract.getAmountInWords(), "Đã bao gồm thuế GTGT"), fontDate);
            inWords.setSpacingAfter(8f);
            document.add(inWords);

            Paragraph art3 = new Paragraph("ĐIỀU 3: CAM KẾT DỊCH VỤ (SLA) & BẢO VỆ DỮ LIỆU CÁ NHÂN (NGHỊ ĐỊNH 13/2023/NĐ-CP)", fontSectionTitle);
            art3.setSpacingAfter(4f);
            document.add(art3);

            String termsText = StringUtils.hasText(contract.getTermsAndConditions())
                    ? contract.getTermsAndConditions()
                    : "3.1. Bên A cam kết thời gian hoạt động hệ thống (Uptime SLA) đạt tối thiểu 99.9%/tháng.\n"
                      + "3.2. Tuân thủ Nghị định 13/2023/NĐ-CP: Bên B là Bên Kiểm soát dữ liệu cá nhân, Bên A là Bên Xử lý dữ liệu cá nhân. "
                      + "Bên A cam kết không chia sẻ hoặc sử dụng dữ liệu ứng viên của Bên B cho bất kỳ bên thứ ba nào.";
            Paragraph art3Body = new Paragraph(termsText, fontBody);
            art3Body.setSpacingAfter(8f);
            document.add(art3Body);

            Paragraph art4 = new Paragraph("ĐIỀU 4: HIỆU LỰC CỦA HỢP ĐỒNG ĐIỆN TỬ VÀ CHỮ KÝ SỐ", fontSectionTitle);
            art4.setSpacingAfter(4f);
            document.add(art4);

            Paragraph art4Body = new Paragraph(
                    "Hợp đồng này được lập dưới dạng Thông điệp dữ liệu điện tử theo Luật Giao dịch điện tử số 20/2023/QH15 "
                            + "và được thực hiện giao kết thông qua nền tảng chứng thực chữ ký điện tử Dropbox Sign (HelloSign) "
                            + "kèm trang Nhật ký Kiểm toán (Audit Trail / Certificate of Completion) và mã băm SHA-256 chống giả mạo.",
                    fontBody);
            art4Body.setSpacingAfter(18f);
            document.add(art4Body);

            // 6. Khối đại diện ký kết
            PdfPTable sigTable = new PdfPTable(2);
            sigTable.setWidthPercentage(100);
            sigTable.setWidths(new float[]{50f, 50f});

            PdfPCell cellA = new PdfPCell();
            cellA.setBorder(Rectangle.NO_BORDER);
            cellA.setHorizontalAlignment(Element.ALIGN_CENTER);
            Paragraph pA1 = new Paragraph("ĐẠI DIỆN BÊN A", fontBodyBold);
            pA1.setAlignment(Element.ALIGN_CENTER);
            Paragraph pA2 = new Paragraph(safe(contract.getPartyAPosition(), "Tổng Giám Đốc"), fontSmall);
            pA2.setAlignment(Element.ALIGN_CENTER);
            Paragraph pA3 = new Paragraph("\n[Đã xác thực phát hành bởi SmartHire-AI]\n\n", fontDate);
            pA3.setAlignment(Element.ALIGN_CENTER);
            Paragraph pA4 = new Paragraph(safe(contract.getPartyARepresentative(), "Phan Nhật Hưng"), fontBodyBold);
            pA4.setAlignment(Element.ALIGN_CENTER);
            cellA.addElement(pA1);
            cellA.addElement(pA2);
            cellA.addElement(pA3);
            cellA.addElement(pA4);

            PdfPCell cellB = new PdfPCell();
            cellB.setBorder(Rectangle.NO_BORDER);
            cellB.setHorizontalAlignment(Element.ALIGN_CENTER);
            Paragraph pB1 = new Paragraph("ĐẠI DIỆN BÊN B", fontBodyBold);
            pB1.setAlignment(Element.ALIGN_CENTER);
            Paragraph pB2 = new Paragraph(safe(contract.getPartyBPosition(), "Đại diện theo pháp luật"), fontSmall);
            pB2.setAlignment(Element.ALIGN_CENTER);
            String sigStatusB = "SIGNED".equalsIgnoreCase(contract.getStatus())
                    ? "\n[Đã ký điện tử qua Dropbox Sign — "
                      + (contract.getSignedAt() != null ? contract.getSignedAt().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")) : "")
                      + "]\n\n"
                    : "\n[Ký điện tử xác thực qua Dropbox Sign]\n\n";
            Paragraph pB3 = new Paragraph(sigStatusB, fontDate);
            pB3.setAlignment(Element.ALIGN_CENTER);
            Paragraph pB4 = new Paragraph(safe(contract.getPartyBRepresentative(), "Đại diện Bên B"), fontBodyBold);
            pB4.setAlignment(Element.ALIGN_CENTER);
            cellB.addElement(pB1);
            cellB.addElement(pB2);
            cellB.addElement(pB3);
            cellB.addElement(pB4);

            sigTable.addCell(cellA);
            sigTable.addCell(cellB);
            document.add(sigTable);

            document.close();
            return out.toByteArray();
        } catch (Exception e) {
            log.error("Failed to generate B2B Contract PDF for {}: {}", contract.getContractNumber(), e.getMessage(), e);
            throw new RuntimeException("Không thể khởi tạo file PDF hợp đồng B2B", e);
        }
    }

    public String computeSha256Hex(byte[] content) {
        if (content == null || content.length == 0) {
            return null;
        }
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(content);
            return HexFormat.of().formatHex(hash);
        } catch (Exception e) {
            throw new IllegalStateException("SHA-256 algorithm not available", e);
        }
    }

    private void addKeyValueLine(Document doc, String label, String value, Font labelFont, Font valueFont) throws DocumentException {
        Paragraph p = new Paragraph();
        p.add(new Chunk(label, labelFont));
        p.add(new Chunk(value != null ? value : "—", valueFont));
        p.setSpacingAfter(2.5f);
        doc.add(p);
    }

    private void addTableRow(PdfPTable table, String col1, String col2, Font f1, Font f2) {
        PdfPCell c1 = new PdfPCell(new Phrase(col1, f1));
        c1.setPadding(6f);
        c1.setBorderColor(new Color(226, 232, 240));
        table.addCell(c1);

        PdfPCell c2 = new PdfPCell(new Phrase(col2, f2));
        c2.setPadding(6f);
        c2.setHorizontalAlignment(Element.ALIGN_RIGHT);
        c2.setBorderColor(new Color(226, 232, 240));
        table.addCell(c2);
    }

    private String formatMoney(BigDecimal amount, String currency) {
        DecimalFormatSymbols symbols = new DecimalFormatSymbols(new Locale("vi", "VN"));
        symbols.setGroupingSeparator('.');
        DecimalFormat df = new DecimalFormat("#,###", symbols);
        return df.format(amount != null ? amount : BigDecimal.ZERO) + " " + currency;
    }

    private String safe(String val, String fallback) {
        return StringUtils.hasText(val) ? val.trim() : fallback;
    }

    private BaseFont loadBaseFont(boolean bold) {
        String resourceName = bold ? "/fonts/Times-New-Roman-Bold.ttf" : "/fonts/Times-New-Roman.ttf";
        try {
            ClassPathResource res = new ClassPathResource(resourceName);
            if (res.exists()) {
                try (InputStream is = res.getInputStream()) {
                    byte[] fontBytes = is.readAllBytes();
                    return BaseFont.createFont(
                            bold ? "Times-New-Roman-Bold.ttf" : "Times-New-Roman.ttf",
                            BaseFont.IDENTITY_H,
                            BaseFont.EMBEDDED,
                            true,
                            fontBytes,
                            null
                    );
                }
            }
        } catch (Exception ex) {
            log.warn("Could not load bundled Times New Roman font {}: {}", resourceName, ex.getMessage());
        }

        try {
            return BaseFont.createFont(bold ? BaseFont.TIMES_BOLD : BaseFont.TIMES_ROMAN, BaseFont.WINANSI, BaseFont.NOT_EMBEDDED);
        } catch (Exception ex) {
            throw new RuntimeException("Fallback font initialization failed", ex);
        }
    }
}
