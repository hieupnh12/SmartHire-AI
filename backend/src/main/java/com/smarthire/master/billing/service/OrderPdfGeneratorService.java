package com.smarthire.master.billing.service;

import com.lowagie.text.*;
import com.lowagie.text.pdf.*;
import com.smarthire.master.billing.dto.OrderPdfData;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.math.BigDecimal;
import java.net.URI;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.util.Locale;

@Slf4j
@Service
public class OrderPdfGeneratorService {

    public byte[] generateOrderPdf(OrderPdfData data) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            BaseFont baseRegular = loadBaseFont(false);
            BaseFont baseBold = loadBaseFont(true);

            Document document = new Document(PageSize.A4, 36, 36, 36, 36);
            PdfWriter writer = PdfWriter.getInstance(document, out);
            writer.setPageEvent(new WatermarkPageEvent(baseBold));
            document.open();

            Font fontCompanyHeader = new Font(baseBold, 10, Font.NORMAL, Color.DARK_GRAY);
            Font fontCompanyMeta = new Font(baseRegular, 8.5f, Font.NORMAL, new Color(75, 85, 99));
            Font fontTitle = new Font(baseBold, 17, Font.NORMAL, new Color(17, 24, 39));
            Font fontDate = new Font(baseRegular, 9.5f, Font.ITALIC, new Color(100, 116, 139));
            Font fontBody = new Font(baseRegular, 9.5f, Font.NORMAL, new Color(30, 41, 59));
            Font fontBodyBold = new Font(baseBold, 9.5f, Font.NORMAL, new Color(15, 23, 42));
            Font fontSectionHeader = new Font(baseBold, 11, Font.NORMAL, new Color(15, 23, 42));
            Font fontTableHeader = new Font(baseBold, 9, Font.NORMAL, new Color(51, 65, 85));
            Font fontTableCell = new Font(baseRegular, 9, Font.NORMAL, new Color(30, 41, 59));
            Font fontTableCellBold = new Font(baseBold, 9, Font.NORMAL, new Color(15, 23, 42));
            Font fontHighlight = new Font(baseBold, 9.5f, Font.NORMAL, new Color(15, 23, 42));

            DecimalFormat currencyFormat = getCurrencyFormatter();

            // 1. Header Công ty (Bảng 2 cột cân đối: Cột trái Logo, Cột phải Thông tin công ty)
            PdfPTable headerTable = new PdfPTable(2);
            headerTable.setWidthPercentage(100);
            // Kích thước logo thực tế scale xuống chiều cao 52px thì bề ngang chỉ khoảng 95.4px
            // 95.4 / 523 = 18.25%. Ta dùng 18.25f để cột ôm sát logo.
            headerTable.setWidths(new float[]{18.25f, 81.75f});

            PdfPCell logoCell = new PdfPCell();
            logoCell.setBorder(Rectangle.NO_BORDER);
            logoCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
            logoCell.setHorizontalAlignment(Element.ALIGN_LEFT);
            logoCell.setPadding(0);
            try {
                ClassPathResource logoRes = new ClassPathResource("/images/logo-smarthrie-email.png");
                if (logoRes.exists()) {
                    try (InputStream is = logoRes.getInputStream()) {
                        byte[] logoBytes = is.readAllBytes();
                        Image logo = Image.getInstance(logoBytes);
                        logo.scaleToFit(130, 52);
                        logo.setAlignment(Element.ALIGN_LEFT);
                        logoCell.addElement(logo);
                    }
                }
            } catch (Exception e) {
                log.warn("Lỗi load logo /images/logo-smarthrie-email.png: {}", e.getMessage());
            }
            headerTable.addCell(logoCell);

            PdfPCell textCell = new PdfPCell();
            textCell.setBorder(Rectangle.NO_BORDER);
            textCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
            textCell.setPaddingLeft(5f);

            Paragraph companyName = new Paragraph("CÔNG TY CỔ PHẦN CÔNG NGHỆ SMARTHIRE VIỆT NAM", fontCompanyHeader);
            companyName.setSpacingAfter(2f);
            textCell.addElement(companyName);

            Paragraph companyTax = new Paragraph("MST: 0110888999", fontCompanyMeta);
            companyTax.setSpacingAfter(1.5f);
            textCell.addElement(companyTax);

            Paragraph companyAddress = new Paragraph("Địa chỉ: Tầng 13, Tòa nhà FPT, Trường Đại học FPT Đà Nẵng, Khu đô thị Công nghệ FPT, Phường Hòa Hải, Quận Ngũ Hành Sơn, TP. Đà Nẵng", fontCompanyMeta);
            textCell.addElement(companyAddress);

            headerTable.addCell(textCell);
            headerTable.setSpacingAfter(18f);
            document.add(headerTable);

            // 2. Tiêu đề THÔNG TIN ĐƠN HÀNG (Căn giữa)
            Paragraph title = new Paragraph("THÔNG TIN ĐƠN HÀNG", fontTitle);
            title.setAlignment(Element.ALIGN_CENTER);
            title.setSpacingAfter(4f);
            document.add(title);

            // Ngày đặt (Căn phải, in nghiêng)
            String formattedDate = "ĐÀ NẴNG, ngày đặt hàng";
            if (StringUtils.hasText(data.getOrderDate())) {
                try {
                    java.time.LocalDate date = java.time.LocalDate.parse(data.getOrderDate(), java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy"));
                    formattedDate = String.format("ĐÀ NẴNG, ngày %02d tháng %d năm %d", date.getDayOfMonth(), date.getMonthValue(), date.getYear());
                } catch (Exception e) {
                    formattedDate = "ĐÀ NẴNG, " + data.getOrderDate();
                }
            }
            Paragraph datePara = new Paragraph(formattedDate, fontDate);
            datePara.setAlignment(Element.ALIGN_RIGHT);
            datePara.setSpacingAfter(14f);
            document.add(datePara);

            // 3. Kính gửi & Lời dẫn
            Paragraph salutation = new Paragraph();
            salutation.add(new Chunk("Kính gửi: ", fontBody));
            salutation.add(new Chunk(StringUtils.hasText(data.getCustomerName()) ? data.getCustomerName() : "Quý khách hàng", fontBodyBold));
            salutation.setSpacingAfter(3f);
            document.add(salutation);

            Paragraph intro = new Paragraph();
            Font fontBodyItalic = new Font(baseRegular, 9.5f, Font.ITALIC, new Color(30, 41, 59));
            intro.add(new Chunk("Công ty Cổ phần Công nghệ SmartHire Việt Nam xin gửi tới Quý khách thông tin đơn hàng ", fontBodyItalic));
            intro.add(new Chunk(data.getInvoiceNumber(), fontBodyBold));
            intro.add(new Chunk(" như sau:", fontBody));
            intro.setSpacingAfter(14f);
            document.add(intro);

            // 4. Thông tin nhận hóa đơn (Khách hàng)
            Paragraph sectionCustomer = new Paragraph("Thông tin nhận hóa đơn", fontSectionHeader);
            sectionCustomer.setSpacingAfter(6f);
            document.add(sectionCustomer);

            PdfPTable customerTable = new PdfPTable(2);
            customerTable.setWidthPercentage(100);
            customerTable.setWidths(new float[]{28f, 72f});
            customerTable.setSpacingAfter(16f);

            addCustomerRow(customerTable, "Mã số thuế/CCCD:", StringUtils.hasText(data.getTaxCode()) ? data.getTaxCode() : "—", fontBody, fontBodyBold);
            addCustomerRow(customerTable, "Tên đơn vị:", StringUtils.hasText(data.getCompanyLegalName()) ? data.getCompanyLegalName() : data.getCustomerName(), fontBody, fontBodyBold);
            addCustomerRow(customerTable, "Địa chỉ đầy đủ:", StringUtils.hasText(data.getBillingAddress()) ? data.getBillingAddress() : "—", fontBody, fontBodyBold);
            addCustomerRow(customerTable, "Email nhận hóa đơn:", StringUtils.hasText(data.getAdminEmail()) ? data.getAdminEmail() : "—", fontBody, fontBodyBold);

            document.add(customerTable);

            // 5. Sản phẩm đã mua (Bảng chi tiết)
            Paragraph sectionProduct = new Paragraph("Sản phẩm đã mua", fontSectionHeader);
            sectionProduct.setSpacingAfter(6f);
            document.add(sectionProduct);

            PdfPTable productTable = new PdfPTable(6);
            productTable.setWidthPercentage(100);
            productTable.setWidths(new float[]{6f, 38f, 10f, 10f, 18f, 18f});
            productTable.setSpacingAfter(18f);

            // Table Header
            String[] headers = {"STT", "Gói sản phẩm/Dịch vụ", "ĐVT", "Số lượng", "Đơn giá (VND)", "Thành tiền (VND)"};
            for (String h : headers) {
                PdfPCell cell = new PdfPCell(new Phrase(h, fontTableHeader));
                cell.setBackgroundColor(new Color(248, 250, 252));
                cell.setPadding(6f);
                cell.setHorizontalAlignment(h.contains("(VND)") || h.equals("Số lượng") ? Element.ALIGN_RIGHT : Element.ALIGN_LEFT);
                cell.setBorderColor(new Color(226, 232, 240));
                productTable.addCell(cell);
            }

            // Subheader banner row
            PdfPCell categoryCell = new PdfPCell(new Phrase("Nền tảng Tuyển dụng thông minh SmartHire-AI", fontTableCellBold));
            categoryCell.setColspan(6);
            categoryCell.setBackgroundColor(new Color(241, 245, 249));
            categoryCell.setPadding(6f);
            categoryCell.setBorderColor(new Color(226, 232, 240));
            productTable.addCell(categoryCell);

            // Item Row
            BigDecimal unitPrice = data.getUnitPrice() != null ? data.getUnitPrice() : BigDecimal.ZERO;
            BigDecimal totalPrice = data.getTotalPrice() != null ? data.getTotalPrice() : BigDecimal.ZERO;

            addCell(productTable, "1", fontTableCell, Element.ALIGN_CENTER);
            addCell(productTable, StringUtils.hasText(data.getPlanName()) ? data.getPlanName() : "Gói Thuê Bao SmartHire", fontTableCellBold, Element.ALIGN_LEFT);
            addCell(productTable, "Năm", fontTableCell, Element.ALIGN_CENTER);
            addCell(productTable, String.valueOf(data.getQuantity() > 0 ? data.getQuantity() : 1), fontTableCell, Element.ALIGN_RIGHT);
            addCell(productTable, currencyFormat.format(unitPrice), fontTableCell, Element.ALIGN_RIGHT);
            addCell(productTable, currencyFormat.format(totalPrice), fontTableCellBold, Element.ALIGN_RIGHT);

            // Summary Rows
            addSummaryRow(productTable, "Tổng tiền", currencyFormat.format(totalPrice), fontTableCellBold, fontTableCellBold, 4);
            addSummaryRow(productTable, "Khuyến mại", "0", fontTableCell, fontTableCell, 4);
            addSummaryRow(productTable, "Tổng thanh toán", currencyFormat.format(totalPrice) + " VND", fontTableCellBold, fontHighlight, 4);

            document.add(productTable);

            // 6. Hướng dẫn thanh toán & QR Code (Bảng khung 2 cột)
            Paragraph sectionPayment = new Paragraph("Vui lòng quét mã QR hoặc chuyển khoản theo thông tin bên dưới để thanh toán ngay.", fontSectionHeader);
            sectionPayment.setSpacingAfter(8f);
            document.add(sectionPayment);

            PdfPTable paymentBox = new PdfPTable(2);
            paymentBox.setWidthPercentage(100);
            paymentBox.setWidths(new float[]{65f, 35f});
            paymentBox.setSpacingAfter(18f);

            // Cột trái: Thông tin chuyển khoản
            PdfPCell leftCell = new PdfPCell();
            leftCell.setPadding(10f);
            leftCell.setBackgroundColor(new Color(248, 250, 252));
            leftCell.setBorderColor(new Color(203, 213, 225));

            PdfPTable bankInfoTable = new PdfPTable(2);
            bankInfoTable.setWidthPercentage(100);
            bankInfoTable.setWidths(new float[]{38f, 62f});

            addBankField(bankInfoTable, "Số tài khoản:", data.getAccountNumber(), fontBody, fontBodyBold);
            addBankField(bankInfoTable, "Tên tài khoản:", data.getAccountName(), fontBody, fontBodyBold);
            addBankField(bankInfoTable, "Ngân hàng:", data.getBankName(), fontBody, fontBodyBold);
            addBankField(bankInfoTable, "Nội dung chuyển khoản:", data.getTransferSyntax(), fontBody, fontHighlight);
            addBankField(bankInfoTable, "Số tiền phải nộp:", currencyFormat.format(totalPrice) + " VND", fontBody, fontHighlight);

            leftCell.addElement(bankInfoTable);
            paymentBox.addCell(leftCell);

            // Cột phải: Mã QR
            PdfPCell rightCell = new PdfPCell();
            rightCell.setPadding(6f);
            rightCell.setBackgroundColor(Color.WHITE);
            rightCell.setBorderColor(new Color(203, 213, 225));
            rightCell.setHorizontalAlignment(Element.ALIGN_CENTER);
            rightCell.setVerticalAlignment(Element.ALIGN_MIDDLE);

            boolean qrAdded = false;
            String qrUrl = data.getQrUrl();
            if (StringUtils.hasText(qrUrl)) {
                // Đổi template sang qr_only để loại bỏ khung viền, chỉ giữ ma trận mã QR đen trắng
                qrUrl = qrUrl.replace("-compact2.png", "-qr_only.png")
                             .replace("-compact.png", "-qr_only.png")
                             .replace("-print.png", "-qr_only.png");
                try {
                    Image qrImage = Image.getInstance(URI.create(qrUrl).toURL());
                    qrImage.scaleToFit(115, 115);
                    qrImage.setAlignment(Element.ALIGN_CENTER);
                    rightCell.addElement(qrImage);
                    qrAdded = true;
                } catch (Exception ex) {
                    log.warn("Could not download QR image for PDF attachment: {}", ex.getMessage());
                }
            }

            if (!qrAdded) {
                Paragraph noQr = new Paragraph("Mã QR Thanh Toán\n(Quét qua App Ngân hàng)", fontDate);
                noQr.setAlignment(Element.ALIGN_CENTER);
                rightCell.addElement(noQr);
            }

            paymentBox.addCell(rightCell);
            document.add(paymentBox);

            // 7. Lời cảm ơn kết thúc
            Paragraph thankYou = new Paragraph("Xin chân thành cảm ơn Quý khách!", fontDate);
            thankYou.setAlignment(Element.ALIGN_CENTER);
            thankYou.setSpacingBefore(10f);
            document.add(thankYou);

            document.close();
            return out.toByteArray();
        } catch (Exception e) {
            log.error("Error generating order PDF for invoice {}: {}", data.getInvoiceNumber(), e.getMessage(), e);
            throw new RuntimeException("Could not generate order PDF", e);
        }
    }

    private void addCustomerRow(PdfPTable table, String label, String value, Font labelFont, Font valFont) {
        PdfPCell cLabel = new PdfPCell(new Phrase(label, labelFont));
        cLabel.setBorder(Rectangle.NO_BORDER);
        cLabel.setPadding(3.5f);
        table.addCell(cLabel);

        PdfPCell cVal = new PdfPCell(new Phrase(value, valFont));
        cVal.setBorder(Rectangle.NO_BORDER);
        cVal.setPadding(3.5f);
        table.addCell(cVal);
    }

    private void addCell(PdfPTable table, String text, Font font, int alignment) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setPadding(6f);
        cell.setHorizontalAlignment(alignment);
        cell.setBorderColor(new Color(226, 232, 240));
        table.addCell(cell);
    }

    private void addSummaryRow(PdfPTable table, String label, String value, Font labelFont, Font valFont, int colspan) {
        PdfPCell cLabel = new PdfPCell(new Phrase(label, labelFont));
        cLabel.setColspan(colspan + 1);
        cLabel.setHorizontalAlignment(Element.ALIGN_RIGHT);
        cLabel.setPadding(6f);
        cLabel.setBorderColor(new Color(226, 232, 240));
        table.addCell(cLabel);

        PdfPCell cVal = new PdfPCell(new Phrase(value, valFont));
        cVal.setHorizontalAlignment(Element.ALIGN_RIGHT);
        cVal.setPadding(6f);
        cVal.setBorderColor(new Color(226, 232, 240));
        table.addCell(cVal);
    }

    private void addBankField(PdfPTable table, String label, String value, Font labelFont, Font valFont) {
        PdfPCell lCell = new PdfPCell(new Phrase(label, labelFont));
        lCell.setBorder(Rectangle.NO_BORDER);
        lCell.setPadding(3f);
        table.addCell(lCell);

        PdfPCell vCell = new PdfPCell(new Phrase(value != null ? value : "—", valFont));
        vCell.setBorder(Rectangle.NO_BORDER);
        vCell.setPadding(3f);
        table.addCell(vCell);
    }

    private BaseFont loadBaseFont(boolean bold) {
        // Ưu tiên tải font Times New Roman hỗ trợ đầy đủ tiếng Việt UTF-8
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

        // Dự phòng bằng font Arial nếu có
        String fallbackArial = bold ? "/fonts/Arial-Bold.ttf" : "/fonts/Arial.ttf";
        try {
            ClassPathResource res = new ClassPathResource(fallbackArial);
            if (res.exists()) {
                try (InputStream is = res.getInputStream()) {
                    byte[] fontBytes = is.readAllBytes();
                    return BaseFont.createFont(
                            bold ? "Arial-Bold.ttf" : "Arial.ttf",
                            BaseFont.IDENTITY_H,
                            BaseFont.EMBEDDED,
                            true,
                            fontBytes,
                            null
                    );
                }
            }
        } catch (Exception ex) {
            log.warn("Could not load bundled Arial font: {}", ex.getMessage());
        }

        try {
            return BaseFont.createFont(bold ? BaseFont.TIMES_BOLD : BaseFont.TIMES_ROMAN, BaseFont.WINANSI, BaseFont.NOT_EMBEDDED);
        } catch (Exception ex) {
            throw new RuntimeException("Fallback font initialization failed", ex);
        }
    }

    private DecimalFormat getCurrencyFormatter() {
        DecimalFormatSymbols symbols = new DecimalFormatSymbols(new Locale("vi", "VN"));
        symbols.setGroupingSeparator('.');
        return new DecimalFormat("#,###", symbols);
    }

    /**
     * Sự kiện vẽ watermark chìm và hình nền trang PDF
     */
    private static class WatermarkPageEvent extends PdfPageEventHelper {
        private final BaseFont font;

        public WatermarkPageEvent(BaseFont font) {
            this.font = font;
        }

        @Override
        public void onEndPage(PdfWriter writer, Document document) {
            try {
                PdfContentByte canvas = writer.getDirectContentUnder();

                // 1. Vẽ hình nền (Background pattern) nếu có
                try {
                    java.net.URL bgUrl = getClass().getResource("/images/bg-pattern.png");
                    if (bgUrl != null) {
                        Image bgImage = Image.getInstance(bgUrl);
                        bgImage.setAbsolutePosition(0, 0);
                        bgImage.scaleAbsolute(document.getPageSize().getWidth(), document.getPageSize().getHeight());
                        canvas.addImage(bgImage);
                    }
                } catch (Exception e) {
                    log.warn("Không thể vẽ hình nền: {}", e.getMessage());
                }

                // 2. Vẽ Watermark logo ở giữa trang (hoặc fallback về chữ)
                try {
                    java.net.URL wmUrl = getClass().getResource("/images/logo-smarthrie-email.png");
                    if (wmUrl != null) {
                        canvas.saveState();
                        PdfGState gstate = new PdfGState();
                        gstate.setFillOpacity(0.08f);
                        canvas.setGState(gstate);

                        Image wmImage = Image.getInstance(wmUrl);
                        wmImage.scaleToFit(350, 350);
                        float x = (document.getPageSize().getWidth() - wmImage.getScaledWidth()) / 2;
                        float y = (document.getPageSize().getHeight() - wmImage.getScaledHeight()) / 2;
                        wmImage.setAbsolutePosition(x, y);

                        canvas.addImage(wmImage);
                        canvas.restoreState();
                    } else {
                        drawTextWatermark(canvas, document);
                    }
                } catch (Exception e) {
                    drawTextWatermark(canvas, document);
                }
            } catch (Exception e) {
                log.warn("Could not draw PDF background/watermark: {}", e.getMessage());
            }
        }

        private void drawTextWatermark(PdfContentByte canvas, Document document) {
            canvas.saveState();
            PdfGState gstate = new PdfGState();
            gstate.setFillOpacity(0.045f);
            canvas.setGState(gstate);
            canvas.setColorFill(Color.GRAY);
            canvas.beginText();
            canvas.setFontAndSize(font, 52);
            float x = (document.left() + document.right()) / 2f;
            float y = (document.top() + document.bottom()) / 2f;
            canvas.showTextAligned(Element.ALIGN_CENTER, "SMARTHIRE - AI", x, y, 40f);
            canvas.endText();
            canvas.restoreState();
        }
    }
}
