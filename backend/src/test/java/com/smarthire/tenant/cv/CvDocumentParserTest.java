package com.smarthire.tenant.cv;

import com.smarthire.tenant.cv.parse.CvDocumentParser;
import java.io.ByteArrayOutputStream;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

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
}
