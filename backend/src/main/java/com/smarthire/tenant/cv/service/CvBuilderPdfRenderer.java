package com.smarthire.tenant.cv.service;

import com.lowagie.text.Chunk;
import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.BaseFont;
import com.lowagie.text.pdf.ColumnText;
import com.lowagie.text.pdf.PdfContentByte;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfPageEventHelper;
import com.lowagie.text.pdf.PdfWriter;
import com.lowagie.text.pdf.draw.LineSeparator;
import com.smarthire.common.exception.BusinessException;
import com.smarthire.tenant.cv.dto.CvModels.BuilderDetail;
import com.smarthire.tenant.cv.dto.CvModels.BuilderItem;
import com.smarthire.tenant.cv.dto.CvModels.BuilderPersonalInfo;
import com.smarthire.tenant.cv.dto.CvModels.BuilderSection;
import com.smarthire.tenant.cv.dto.CvModels.CvBuilderData;
import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

/** Renders builder JSON into a text-based PDF so the regular CV parsing pipeline can read it. */
@Component
public class CvBuilderPdfRenderer {
    private static final Logger log = LoggerFactory.getLogger(CvBuilderPdfRenderer.class);
    private static final Color DEFAULT_ACCENT = new Color(37, 99, 235);
    private static final Color INK = new Color(15, 23, 42);
    private static final Color BODY = new Color(30, 41, 59);
    private static final Color MUTED = new Color(100, 116, 139);

    public byte[] render(CvBuilderData data) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            BaseFont regular = font(false);
            BaseFont bold = font(true);
            Color accent = accent(data.accentColor());
            Font nameFont = new Font(bold, 22, Font.NORMAL, INK);
            Font titleFont = new Font(regular, 12, Font.NORMAL, accent);
            Font sectionFont = new Font(bold, 12, Font.NORMAL, accent);
            Font itemTitleFont = new Font(bold, 10.5f, Font.NORMAL, INK);
            Font mutedFont = new Font(regular, 9.5f, Font.NORMAL, MUTED);
            Font bodyFont = new Font(regular, 10, Font.NORMAL, BODY);

            BuilderPersonalInfo info = data.personalInfo();
            Document document = new Document(PageSize.A4, 42, 42, 40, 48);
            PdfWriter writer = PdfWriter.getInstance(document, out);
            writer.setPageEvent(new FooterEvent(info.fullName().strip() + " – CV",
                    "en".equals(data.language()) ? "Page " : "Trang ", new Font(regular, 8, Font.NORMAL, MUTED)));
            document.open();

            document.add(paragraph(info.fullName(), nameFont, 0));
            if (hasText(info.title())) document.add(paragraph(info.title(), titleFont, 2));
            String contact = Stream.of(info.email(), info.phone(), info.address(), info.linkedin(), info.github(), info.website())
                    .filter(CvBuilderPdfRenderer::hasText)
                    .map(String::strip)
                    .collect(Collectors.joining("  |  "));
            if (!contact.isEmpty()) document.add(paragraph(contact, mutedFont, 4));
            if (info.details() != null) {
                for (BuilderDetail detail : info.details()) {
                    if (!hasText(detail.value())) continue;
                    String label = hasText(detail.label()) ? detail.label().strip() + ": " : "";
                    document.add(paragraph(label + detail.value().strip(), mutedFont, 1));
                }
            }
            for (String line : textLines(info.summary())) document.add(paragraph(line, bodyFont, 6));

            for (BuilderSection section : data.sections()) {
                if (!section.visible() || section.items().isEmpty()) continue;
                Paragraph heading = paragraph(hasText(section.title()) ? section.title() : section.type(), sectionFont, 14);
                heading.add(new Chunk(new LineSeparator(0.8f, 100, accent, Element.ALIGN_CENTER, -4)));
                heading.setSpacingAfter(4);
                document.add(heading);
                boolean skills = "skills".equals(section.type());
                for (BuilderItem item : section.items()) {
                    String level = skills ? skillLabel(item.level(), data.language()) : levelDots(item.level());
                    addItem(document, item, level, itemTitleFont, mutedFont, bodyFont);
                }
            }
            document.close();
            return out.toByteArray();
        } catch (Exception ex) {
            log.error("Failed to render builder CV", ex);
            throw new BusinessException("Cannot render CV", HttpStatus.INTERNAL_SERVER_ERROR, "CV_RENDER_FAILED");
        }
    }

    private static void addItem(Document document, BuilderItem item, String level, Font titleFont, Font mutedFont, Font bodyFont) {
        String right = Stream.of(item.date(), level)
                .filter(CvBuilderPdfRenderer::hasText)
                .collect(Collectors.joining("  "));
        if (hasText(item.title()) || hasText(right)) {
            PdfPTable row = new PdfPTable(new float[] { 70, 30 });
            row.setWidthPercentage(100);
            row.setSpacingBefore(6);
            row.addCell(cell(item.title(), titleFont, Element.ALIGN_LEFT));
            row.addCell(cell(right, mutedFont, Element.ALIGN_RIGHT));
            document.add(row);
        }
        if (hasText(item.subtitle())) document.add(paragraph(item.subtitle(), mutedFont, 1));
        for (String line : textLines(item.description())) document.add(paragraph(line, bodyFont, 2));
    }

    /** Running footer on every page: "{name} – CV" on the left, page number on the right. */
    private static final class FooterEvent extends PdfPageEventHelper {
        private final String left;
        private final String pagePrefix;
        private final Font font;

        FooterEvent(String left, String pagePrefix, Font font) {
            this.left = left;
            this.pagePrefix = pagePrefix;
            this.font = font;
        }

        @Override
        public void onEndPage(PdfWriter writer, Document document) {
            PdfContentByte canvas = writer.getDirectContent();
            float y = document.bottom() - 22;
            canvas.saveState();
            canvas.setColorStroke(new Color(226, 232, 240));
            canvas.setLineWidth(0.5f);
            canvas.moveTo(document.left(), y + 10);
            canvas.lineTo(document.right(), y + 10);
            canvas.stroke();
            canvas.restoreState();
            ColumnText.showTextAligned(canvas, Element.ALIGN_LEFT, new Phrase(left, font), document.left(), y, 0);
            ColumnText.showTextAligned(canvas, Element.ALIGN_RIGHT, new Phrase(pagePrefix + writer.getPageNumber(), font), document.right(), y, 0);
        }
    }

    static String levelDots(Integer level) {
        if (level == null || level <= 0) return null;
        int filled = Math.min(level, 5);
        return "●".repeat(filled) + "○".repeat(5 - filled);
    }

    /** Skills use text proficiency (1-2 familiar, 3-4 intermediate, 5 proficient) instead of dots. */
    static String skillLabel(Integer level, String language) {
        if (level == null || level <= 0) return null;
        boolean en = "en".equals(language);
        if (level >= 5) return en ? "Proficient" : "Thành thạo";
        if (level >= 3) return en ? "Intermediate" : "Khá";
        return en ? "Familiar" : "Biết";
    }

    private static PdfPCell cell(String text, Font font, int align) {
        PdfPCell cell = new PdfPCell(new Phrase(text == null ? "" : text.strip(), font));
        cell.setBorder(Rectangle.NO_BORDER);
        cell.setPadding(0);
        cell.setHorizontalAlignment(align);
        return cell;
    }

    private static Paragraph paragraph(String text, Font font, float spacingBefore) {
        Paragraph paragraph = new Paragraph(text.strip(), font);
        paragraph.setSpacingBefore(spacingBefore);
        paragraph.setLeading(font.getSize() * 1.35f);
        return paragraph;
    }

    /** Flattens the builder's limited rich-text HTML (b/i/ul/ol/li/br/p/div) into plain lines. */
    static List<String> textLines(String html) {
        if (!hasText(html)) return List.of();
        String text = html
                .replaceAll("(?i)<li[^>]*>", "\n• ")
                .replaceAll("(?i)<br\\s*/?>|</?(p|div|li|ul|ol)[^>]*>", "\n")
                .replaceAll("<[^>]+>", "")
                .replace("&nbsp;", " ")
                .replace("&lt;", "<")
                .replace("&gt;", ">")
                .replace("&quot;", "\"")
                .replace("&#39;", "'")
                .replace("&amp;", "&");
        return Arrays.stream(text.split("\n")).map(String::strip).filter(line -> !line.isEmpty()).toList();
    }

    private static Color accent(String hex) {
        if (!hasText(hex) || !hex.matches("^#[0-9a-fA-F]{6}$")) return DEFAULT_ACCENT;
        return new Color(Integer.parseInt(hex.substring(1), 16));
    }

    private static BaseFont font(boolean bold) throws Exception {
        String name = bold ? "Arial-Bold.ttf" : "Arial.ttf";
        ClassPathResource resource = new ClassPathResource("/fonts/" + name);
        if (resource.exists()) {
            try (InputStream in = resource.getInputStream()) {
                return BaseFont.createFont(name, BaseFont.IDENTITY_H, BaseFont.EMBEDDED, true, in.readAllBytes(), null);
            }
        }
        log.warn("Bundled font {} missing; Vietnamese glyphs may not render", name);
        return BaseFont.createFont(bold ? BaseFont.HELVETICA_BOLD : BaseFont.HELVETICA, BaseFont.WINANSI, BaseFont.NOT_EMBEDDED);
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
