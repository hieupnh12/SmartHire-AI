package com.smarthire.tenant.cv.parse;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.Locale;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.hwpf.HWPFDocument;
import org.apache.poi.hwpf.extractor.WordExtractor;
import org.apache.poi.xwpf.extractor.XWPFWordExtractor;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.springframework.stereotype.Component;

@Component
public class CvDocumentParser {
    public static final String VERSION = "pdfbox-3.0.3+poi-5.3.0";

    public record Result(String text, int pageCount, boolean likelyScan) {}

    public Result parse(byte[] content, String filename, String mimeType) throws IOException {
        String name = filename == null ? "" : filename.toLowerCase(Locale.ROOT);
        String mime = mimeType == null ? "" : mimeType.toLowerCase(Locale.ROOT);
        if (name.endsWith(".docx") || mime.contains("wordprocessingml")) return docx(content);
        if (name.endsWith(".doc") || mime.contains("msword") || mime.contains("ms-word")) return doc(content);
        if (name.endsWith(".pdf") || mime.contains("pdf")) return pdf(content);
        throw new IOException("Unsupported CV type");
    }

    private Result pdf(byte[] content) throws IOException {
        try (PDDocument document = Loader.loadPDF(content)) {
            String text = new PDFTextStripper().getText(document);
            int pages = document.getNumberOfPages();
            return new Result(text == null ? "" : text.trim(), pages, (text == null ? 0 : text.trim().length()) < 80);
        }
    }

    private Result docx(byte[] content) throws IOException {
        try (XWPFDocument document = new XWPFDocument(new ByteArrayInputStream(content));
             XWPFWordExtractor extractor = new XWPFWordExtractor(document)) {
            String text = extractor.getText();
            int pages = 1;
            try {
                int documented = document.getProperties().getExtendedProperties().getUnderlyingProperties().getPages();
                if (documented > 0) pages = documented;
            } catch (Exception ignored) {
                // page metadata is optional
            }
            return new Result(text == null ? "" : text.trim(), pages, false);
        } catch (Exception ex) {
            throw new IOException("Failed to parse DOCX", ex);
        }
    }

    private Result doc(byte[] content) throws IOException {
        try (HWPFDocument document = new HWPFDocument(new ByteArrayInputStream(content));
             WordExtractor extractor = new WordExtractor(document)) {
            String text = extractor.getText();
            int pages = Math.max(1, document.getSummaryInformation() == null
                    ? 1
                    : Math.max(1, document.getSummaryInformation().getPageCount()));
            return new Result(text == null ? "" : text.trim(), pages, false);
        } catch (Exception ex) {
            throw new IOException("Failed to parse DOC", ex);
        }
    }
}
