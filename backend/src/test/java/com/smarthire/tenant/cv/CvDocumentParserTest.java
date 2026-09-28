package com.smarthire.tenant.cv;

import com.smarthire.tenant.cv.parse.CvDocumentParser;
import java.io.ByteArrayOutputStream;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFRun;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CvDocumentParserTest {
    private final CvDocumentParser parser = new CvDocumentParser();

    @Test
    void extractsTextFromPdf() throws Exception {
        byte[] pdf;
        try (PDDocument document = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PDPage page = new PDPage();
            document.addPage(page);
            try (PDPageContentStream stream = new PDPageContentStream(document, page)) {
                stream.beginText();
                stream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 12);
                stream.newLineAtOffset(50, 700);
                stream.showText("Jane Doe Java Spring Boot ReactJS backend developer with production experience");
                stream.endText();
            }
            document.save(out);
            pdf = out.toByteArray();
        }
        var result = parser.parse(pdf, "cv.pdf", "application/pdf");
        assertThat(result.text()).contains("Java").contains("ReactJS");
        assertThat(result.pageCount()).isEqualTo(1);
        assertThat(result.text().length()).isGreaterThan(20);
    }

    @Test
    void extractsTextFromDocx() throws Exception {
        byte[] docx;
        try (XWPFDocument document = new XWPFDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            XWPFParagraph paragraph = document.createParagraph();
            XWPFRun run = paragraph.createRun();
            run.setText("Jane Doe Java Spring Boot developer");
            document.write(out);
            docx = out.toByteArray();
        }
        var result = parser.parse(docx, "cv.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
        assertThat(result.text()).contains("Java").contains("Spring Boot");
    }

    @Test
    void routesLegacyDocByExtensionAndMime() {
        assertThatThrownBy(() -> parser.parse(new byte[] { 1, 2, 3 }, "cv.doc", "application/msword"))
                .hasMessageContaining("Failed to parse DOC");
        assertThatThrownBy(() -> parser.parse(new byte[] { 1, 2, 3 }, "resume.DOC", ""))
                .hasMessageContaining("Failed to parse DOC");
    }
}
