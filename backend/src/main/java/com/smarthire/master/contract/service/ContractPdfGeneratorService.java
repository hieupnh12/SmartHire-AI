package com.smarthire.master.contract.service;

import com.lowagie.text.*;
import com.lowagie.text.pdf.*;
import com.smarthire.domain.master.entity.Contract;
import com.smarthire.domain.master.entity.SubscriptionPlan;
import com.smarthire.domain.master.entity.TenantInfo;
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
        SubscriptionPlan fallbackPlan = SubscriptionPlan.builder()
                .name(planName)
                .build();
        TenantInfo fallbackTenant = TenantInfo.builder()
                .code(tenantCode)
                .subdomain(tenantCode)
                .build();
        return generateContractPdf(contract, fallbackPlan, fallbackTenant);
    }

    public byte[] generateContractPdf(Contract contract, SubscriptionPlan plan, TenantInfo tenant) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            BaseFont baseRegular = loadBaseFont(false);
            BaseFont baseBold = loadBaseFont(true);

            Document document = new Document(PageSize.A4, 42, 42, 36, 36);
            PdfWriter.getInstance(document, out);
            document.open();

            Font fontNationalTitle = new Font(baseBold, 11, Font.NORMAL, Color.BLACK);
            Font fontNationalSub = new Font(baseBold, 10.5f, Font.UNDERLINE, Color.BLACK);
            Font fontDate = new Font(baseRegular, 9.5f, Font.ITALIC, new Color(71, 85, 105));
            Font fontContractTitle = new Font(baseBold, 13.5f, Font.NORMAL, new Color(15, 23, 42));
            Font fontContractSubTitle = new Font(baseBold, 11.5f, Font.NORMAL, new Color(30, 58, 138));
            Font fontContractNo = new Font(baseBold, 10, Font.NORMAL, new Color(30, 41, 59));
            Font fontLegalBasis = new Font(baseRegular, 9.5f, Font.ITALIC, new Color(51, 65, 85));
            Font fontSectionTitle = new Font(baseBold, 10.5f, Font.NORMAL, new Color(15, 23, 42));
            Font fontBody = new Font(baseRegular, 9.8f, Font.NORMAL, new Color(15, 23, 42));
            Font fontBodyBold = new Font(baseBold, 9.8f, Font.NORMAL, new Color(15, 23, 42));
            Font fontSmall = new Font(baseRegular, 8.5f, Font.NORMAL, new Color(100, 116, 139));

            LocalDateTime createdAt = contract.getCreatedAt() != null ? contract.getCreatedAt() : LocalDateTime.now();

            String planName = plan != null && StringUtils.hasText(plan.getName()) ? plan.getName() : "Enterprise B2B";
            String tenantCode = tenant != null && StringUtils.hasText(tenant.getCode()) ? tenant.getCode() : "enterprise";
            String subdomain = tenant != null && StringUtils.hasText(tenant.getSubdomain()) ? tenant.getSubdomain() : tenantCode;

            String maxJobsStr = formatQuota(plan != null ? plan.getMaxJobs() : null, "tin");
            String maxCvStr = formatQuota(plan != null ? plan.getMaxCvParses() : null, "hồ sơ");
            String maxAiHoursStr = formatQuota(plan != null ? plan.getMaxAiInterviewHours() : null, "giờ");
            String maxStorageStr = formatQuota(plan != null ? plan.getMaxStorageGb() : null, "GB");

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
            dateLine.setSpacingAfter(10f);
            document.add(dateLine);

            // 2. Tiêu đề Hợp đồng
            Paragraph title = new Paragraph("HỢP ĐỒNG CUNG CẤP DỊCH VỤ PHẦN MỀM TUYỂN DỤNG AI", fontContractTitle);
            title.setAlignment(Element.ALIGN_CENTER);
            document.add(title);

            Paragraph subTitle = new Paragraph("& HẠ TẦNG CƠ SỞ DỮ LIỆU ĐỘC LẬP", fontContractSubTitle);
            subTitle.setAlignment(Element.ALIGN_CENTER);
            subTitle.setSpacingAfter(4f);
            document.add(subTitle);

            Paragraph contractNo = new Paragraph(
                    "Số: " + safe(contract.getContractNumber(), "CTR-B2B") + "/HĐDV-SMARTHIRE",
                    fontContractNo);
            contractNo.setAlignment(Element.ALIGN_CENTER);
            contractNo.setSpacingAfter(10f);
            document.add(contractNo);

            // 3. Căn cứ pháp lý
            Paragraph basis1 = new Paragraph("• Căn cứ Bộ luật Dân sự số 91/2015/QH13;", fontLegalBasis);
            Paragraph basis2 = new Paragraph("• Căn cứ Luật Thương mại số 36/2005/QH11;", fontLegalBasis);
            Paragraph basis3 = new Paragraph("• Căn cứ Luật Giao dịch điện tử số 20/2023/QH15;", fontLegalBasis);
            Paragraph basis4 = new Paragraph("• Căn cứ Nghị định số 13/2023/NĐ-CP của Chính phủ về Bảo vệ dữ liệu cá nhân;", fontLegalBasis);
            Paragraph basis5 = new Paragraph("• Căn cứ vào nhu cầu và năng lực thực tế của hai bên.", fontLegalBasis);
            basis5.setSpacingAfter(8f);
            document.add(basis1);
            document.add(basis2);
            document.add(basis3);
            document.add(basis4);
            document.add(basis5);

            // 4. Thông tin hai bên
            Paragraph partyAHeader = new Paragraph("BÊN A: " + safe(contract.getPartyAName(), "CÔNG TY CỔ PHẦN CÔNG NGHỆ SMARTHIRE VIỆT NAM"), fontSectionTitle);
            partyAHeader.setSpacingAfter(3f);
            document.add(partyAHeader);

            addKeyValueLine(document, "Mã số thuế: ", safe(contract.getPartyATaxCode(), "0110889988"), fontBody, fontBodyBold);
            addKeyValueLine(document, "Trụ sở: ", safe(contract.getPartyAAddress(), "Tòa nhà Keangnam Landmark 72, Đường Phạm Hùng, Nam Từ Liêm, Hà Nội"), fontBody, fontBody);
            addKeyValueLine(document, "Người đại diện: ", safe(contract.getPartyARepresentative(), "Phan Nhật Hưng") + " — Chức vụ: " + safe(contract.getPartyAPosition(), "Tổng Giám Đốc"), fontBody, fontBodyBold);
            addKeyValueLine(document, "Email pháp chế: ", safe(contract.getPartyAEmail(), "legal@smarthire.top") + " — Hotline: " + safe(contract.getPartyAPhone(), "1900 6868"), fontBody, fontBody);
            addKeyValueLine(document, "Tài khoản: ", safe(contract.getPartyABankAccount(), "190388889999") + " tại " + safe(contract.getPartyABankName(), "Ngân hàng Techcombank") + " – " + safe(contract.getPartyABankBranch(), "CN Hà Nội"), fontBody, fontBodyBold);

            Paragraph partyBHeader = new Paragraph("BÊN B: BÊN SỬ DỤNG DỊCH VỤ", fontSectionTitle);
            partyBHeader.setSpacingBefore(6f);
            partyBHeader.setSpacingAfter(3f);
            document.add(partyBHeader);

            addKeyValueLine(document, "Tên doanh nghiệp: ", safe(contract.getPartyBName(), "Doanh nghiệp khách hàng"), fontBody, fontBodyBold);
            addKeyValueLine(document, "Mã số thuế: ", safe(contract.getPartyBTaxCode(), "Theo ĐKKD"), fontBody, fontBodyBold);
            addKeyValueLine(document, "Địa chỉ: ", safe(contract.getPartyBAddress(), "Theo Giấy chứng nhận ĐKKD"), fontBody, fontBody);
            addKeyValueLine(document, "Đại diện bởi: ", safe(contract.getPartyBRepresentative(), "Đại diện theo pháp luật") + " — Chức vụ: " + safe(contract.getPartyBPosition(), "Giám Đốc"), fontBody, fontBodyBold);
            addKeyValueLine(document, "Email nhận thông báo: ", safe(contract.getPartyBEmail(), "") + " — SĐT: " + safe(contract.getPartyBPhone(), "—"), fontBody, fontBodyBold);

            // 5. ĐIỀU 1: ĐỐI TƯỢNG VÀ PHẠM VI DỊCH VỤ
            Paragraph art1 = new Paragraph("ĐIỀU 1: ĐỐI TƯỢNG VÀ PHẠM VI DỊCH VỤ", fontSectionTitle);
            art1.setSpacingBefore(8f);
            art1.setSpacingAfter(3f);
            document.add(art1);

            Paragraph art1Body1 = new Paragraph(
                    "1.1. Bên A cấp cho Bên B quyền truy cập và sử dụng nền tảng tuyển dụng thông minh SmartHire-AI theo mô hình thuê bao dịch vụ phần mềm (SaaS).\n"
                            + "   • Gói dịch vụ: " + planName + "\n"
                            + "   • Thời hạn hiệu lực: Từ ngày " + safe(String.valueOf(contract.getStartDate()), "—")
                            + " đến hết ngày " + safe(String.valueOf(contract.getEndDate()), "—") + ".\n"
                            + "   • Địa chỉ truy cập (Workspace Subdomain): " + subdomain + ".smarthire.top",
                    fontBody);
            Paragraph art1Body2 = new Paragraph(
                    "1.2. Hạn mức tài nguyên được cấp trong chu kỳ hợp đồng:\n"
                            + "   • Số vị trí tuyển dụng mở tối đa (Active Jobs): " + maxJobsStr + ".\n"
                            + "   • Số lượt phân tích & sàng lọc CV AI: " + maxCvStr + ".\n"
                            + "   • Thời lượng phỏng vấn AI & Đánh giá gian lận: " + maxAiHoursStr + ".\n"
                            + "   • Dung lượng lưu trữ cơ sở dữ liệu & media: " + maxStorageStr + ".",
                    fontBody);
            Paragraph art1Body3 = new Paragraph(
                    "1.3. Kiến trúc Cô lập Dữ liệu (Database-per-Tenant): Bên A khởi tạo một cơ sở dữ liệu vật lý độc lập mang mã định danh smarthire_tenant_"
                            + tenantCode + " dành riêng cho Bên B, bảo đảm toàn bộ dữ liệu ứng viên không bị dùng chung bảng hoặc chia sẻ với bất kỳ khách hàng nào khác.",
                    fontBody);
            art1Body3.setSpacingAfter(6f);
            document.add(art1Body1);
            document.add(art1Body2);
            document.add(art1Body3);

            // 6. ĐIỀU 2: GIÁ TRỊ HỢP ĐỒNG VÀ PHƯƠNG THỨC THANH TOÁN
            Paragraph art2 = new Paragraph("ĐIỀU 2: GIÁ TRỊ HỢP ĐỒNG VÀ PHƯƠNG THỨC THANH TOÁN", fontSectionTitle);
            art2.setSpacingAfter(3f);
            document.add(art2);

            String currency = safe(contract.getCurrency(), "VND");
            BigDecimal value = contract.getContractValue() != null ? contract.getContractValue() : BigDecimal.ZERO;
            BigDecimal taxRate = contract.getTaxRate() != null ? contract.getTaxRate() : BigDecimal.ZERO;
            BigDecimal taxAmount = contract.getTaxAmount() != null ? contract.getTaxAmount() : BigDecimal.ZERO;
            BigDecimal totalAmount = contract.getTotalAmount() != null && contract.getTotalAmount().compareTo(BigDecimal.ZERO) > 0
                    ? contract.getTotalAmount()
                    : value.add(taxAmount);

            String vatDescription = taxRate.compareTo(BigDecimal.ZERO) == 0
                    ? "Không chịu thuế GTGT (theo Khoản 21 Điều 4 Thông tư 219/2013/TT-BTC đối với dịch vụ phần mềm)."
                    : formatMoney(taxAmount, currency) + " (VAT " + taxRate + "%).";

            Paragraph art2Body1 = new Paragraph("2.1. Chi phí bản quyền dịch vụ: " + formatMoney(value, currency) + ".", fontBody);
            Paragraph art2Body2 = new Paragraph("2.2. Thuế GTGT: " + vatDescription, fontBody);
            Paragraph art2Body3 = new Paragraph(
                    "2.3. Tổng số tiền thanh toán: " + formatMoney(totalAmount, currency)
                            + " (Bằng chữ: " + safe(contract.getAmountInWords(), "Không chịu thuế GTGT") + ").",
                    fontBodyBold);
            Paragraph art2Body4 = new Paragraph(
                    "2.4. Thời hạn thanh toán: Bên B thanh toán 100% giá trị hợp đồng bằng phương thức chuyển khoản vào tài khoản ngân hàng của Bên A trong vòng 05 (năm) ngày làm việc kể từ ngày hai bên hoàn tất ký số hợp đồng.",
                    fontBody);
            Paragraph art2Body5 = new Paragraph(
                    "2.5. Bên A kích hoạt quyền truy cập Workspace và bàn giao tài khoản Master Admin cho Bên B ngay sau khi nhận được thông báo ghi có từ ngân hàng.",
                    fontBody);
            art2Body5.setSpacingAfter(6f);
            document.add(art2Body1);
            document.add(art2Body2);
            document.add(art2Body3);
            document.add(art2Body4);
            document.add(art2Body5);

            // 7. ĐIỀU 3: CAM KẾT MỨC DỊCH VỤ (SLA) & BẢO VỆ DỮ LIỆU CÁ NHÂN
            Paragraph art3 = new Paragraph("ĐIỀU 3: CAM KẾT MỨC DỊCH VỤ (SLA) & BẢO VỆ DỮ LIỆU CÁ NHÂN", fontSectionTitle);
            art3.setSpacingAfter(3f);
            document.add(art3);

            String defaultArt3 = "3.1. Cam kết chất lượng (SLA): Bên A cam kết độ sẵn sàng của hạ tầng hệ thống (Uptime SLA) đạt tối thiểu 99.5%/tháng, thực hiện sao lưu dữ liệu tự động định kỳ hàng ngày.\n"
                    + "3.2. Tuân thủ Nghị định 13/2023/NĐ-CP:\n"
                    + "   • Bên B xác nhận là Bên Kiểm soát Dữ liệu Cá nhân và chịu trách nhiệm thu thập sự đồng ý hợp pháp của Ứng viên trước khi đưa thông tin vào phần mềm.\n"
                    + "   • Bên A đóng vai trò là Bên Xử lý Dữ liệu Cá nhân theo ủy quyền; cam kết bảo mật tuyệt đối và không sử dụng dữ liệu riêng của Bên B để huấn luyện mô hình AI công cộng hoặc chia sẻ cho bên thứ ba.\n"
                    + "3.3. Giới hạn trách nhiệm AI: Các tính năng đánh giá tự động của AI đóng vai trò là công cụ hỗ trợ sàng lọc; Bên B giữ toàn quyền và chịu hoàn toàn trách nhiệm đối với các quyết định tuyển dụng nhân sự cuối cùng.";
            String termsText = StringUtils.hasText(contract.getTermsAndConditions())
                    ? contract.getTermsAndConditions()
                    : defaultArt3;
            Paragraph art3Body = new Paragraph(termsText, fontBody);
            art3Body.setSpacingAfter(6f);
            document.add(art3Body);

            // 8. ĐIỀU 4: HIỆU LỰC HỢP ĐỒNG ĐIỆN TỬ VÀ CHỮ KÝ SỐ
            Paragraph art4 = new Paragraph("ĐIỀU 4: HIỆU LỰC HỢP ĐỒNG ĐIỆN TỬ VÀ CHỮ KÝ SỐ", fontSectionTitle);
            art4.setSpacingAfter(3f);
            document.add(art4);

            Paragraph art4Body1 = new Paragraph(
                    "4.1. Hợp đồng này được khởi tạo, gửi và ký kết dưới dạng Thông điệp dữ liệu điện tử hợp pháp theo Luật Giao dịch điện tử số 20/2023/QH15.",
                    fontBody);
            Paragraph art4Body2 = new Paragraph(
                    "4.2. Việc giao kết được thực hiện qua nền tảng chứng thực chữ ký số độc lập Dropbox Sign (HelloSign). File hợp đồng hoàn tất có gắn kèm Nhật ký Kiểm toán (Audit Trail) cùng mã băm toàn vẹn SHA-256 có giá trị pháp lý ràng buộc tương đương văn bản giấy đóng dấu mộc đỏ.",
                    fontBody);
            Paragraph art4Body3 = new Paragraph(
                    "4.3. Trường hợp phát sinh tranh chấp, hai bên ưu tiên thương lượng hòa giải. Nếu không thống nhất được, tranh chấp sẽ được đưa ra giải quyết tại Tòa án nhân dân có thẩm quyền tại Thành phố Hà Nội.",
                    fontBody);
            art4Body3.setSpacingAfter(14f);
            document.add(art4Body1);
            document.add(art4Body2);
            document.add(art4Body3);

            // 9. Khối đại diện ký kết
            PdfPTable sigTable = new PdfPTable(2);
            sigTable.setWidthPercentage(100);
            sigTable.setWidths(new float[]{50f, 50f});

            PdfPCell cellA = new PdfPCell();
            cellA.setBorder(Rectangle.NO_BORDER);
            cellA.setHorizontalAlignment(Element.ALIGN_CENTER);
            Paragraph pA1 = new Paragraph("ĐẠI DIỆN BÊN A", fontBodyBold);
            pA1.setAlignment(Element.ALIGN_CENTER);
            Paragraph pA2 = new Paragraph("(Ký số điện tử)", fontSmall);
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
            Paragraph pB2 = new Paragraph("(Ký số điện tử)", fontSmall);
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

    private String formatQuota(Integer quota, String unit) {
        if (quota == null) return "Không giới hạn";
        if (quota <= 0) return "Không giới hạn";
        DecimalFormatSymbols symbols = new DecimalFormatSymbols(Locale.of("vi", "VN"));
        symbols.setGroupingSeparator('.');
        DecimalFormat df = new DecimalFormat("#,###", symbols);
        return df.format(quota) + " " + unit;
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

    private String formatMoney(BigDecimal amount, String currency) {
        DecimalFormatSymbols symbols = new DecimalFormatSymbols(Locale.of("vi", "VN"));
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
