package com.smarthire.tenant.cv.service;

import com.smarthire.common.exception.BusinessException;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * Converts the CV Builder's rendered A4 sheet (HTML + CSS captured in the browser) into a vector PDF through a
 * Gotenberg (headless Chromium) container, so the download looks exactly like the editor.
 */
@Service
public class CvPdfExportService {
    private static final Logger log = LoggerFactory.getLogger(CvPdfExportService.class);
    private static final List<String> FONT_FILES = List.of("Arial.ttf", "Arial-Bold.ttf", "Times-New-Roman.ttf", "Times-New-Roman-Bold.ttf");
    /** Bundled fonts for the CV font stacks; Tahoma/Georgia use a locally installed copy when the container has one. */
    private static final String FONT_FACES = """
            @font-face { font-family: "Arial"; src: url("Arial.ttf"); font-weight: 400; }
            @font-face { font-family: "Arial"; src: url("Arial-Bold.ttf"); font-weight: 700; }
            @font-face { font-family: "Times New Roman"; src: url("Times-New-Roman.ttf"); font-weight: 400; }
            @font-face { font-family: "Times New Roman"; src: url("Times-New-Roman-Bold.ttf"); font-weight: 700; }
            @font-face { font-family: "Tahoma"; src: local("Tahoma"), url("Arial.ttf"); font-weight: 400; }
            @font-face { font-family: "Tahoma"; src: local("Tahoma Bold"), local("Tahoma-Bold"), url("Arial-Bold.ttf"); font-weight: 700; }
            @font-face { font-family: "Georgia"; src: local("Georgia"), url("Times-New-Roman.ttf"); font-weight: 400; }
            @font-face { font-family: "Georgia"; src: local("Georgia Bold"), local("Georgia-Bold"), url("Times-New-Roman-Bold.ttf"); font-weight: 700; }
            """;

    private final RestClient http;
    private final String gotenbergUrl;

    public CvPdfExportService(@Value("${app.cv.gotenberg-url:http://localhost:3000}") String gotenbergUrl) {
        this.gotenbergUrl = gotenbergUrl.replaceAll("/+$", "");
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(5));
        factory.setReadTimeout(Duration.ofSeconds(45));
        this.http = RestClient.builder().requestFactory(factory).build();
    }

    public byte[] export(String html, String css) {
        var form = new LinkedMultiValueMap<String, Object>();
        form.add("files", file("index.html", documentFor(html, css).getBytes(StandardCharsets.UTF_8)));
        for (String font : FONT_FILES) form.add("files", file(font, fontBytes(font)));
        form.add("paperWidth", "8.27");
        form.add("paperHeight", "11.7");
        form.add("marginTop", "0");
        form.add("marginBottom", "0");
        form.add("marginLeft", "0");
        form.add("marginRight", "0");
        form.add("preferCssPageSize", "true");
        form.add("printBackground", "true");
        form.add("skipNetworkIdleEvent", "false");
        try {
            byte[] pdf = http.post()
                    .uri(gotenbergUrl + "/forms/chromium/convert/html")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(form)
                    .retrieve()
                    .body(byte[].class);
            if (pdf == null || pdf.length == 0) throw new RestClientException("Empty PDF");
            return pdf;
        } catch (RestClientException ex) {
            log.error("Gotenberg PDF export failed: {}", ex.getMessage());
            throw new BusinessException("PDF service is unavailable, please try again later",
                    HttpStatus.SERVICE_UNAVAILABLE, "CV_PDF_UNAVAILABLE");
        }
    }

    public String documentFor(String html, String css) {
        return "<!doctype html><html><head><meta charset=\"utf-8\"><style>" + FONT_FACES + "</style><style>"
                + (css == null ? "" : css.replace("</style", "<\\/style"))
                + "</style></head><body>" + html + "</body></html>";
    }

    private static ByteArrayResource file(String name, byte[] content) {
        return new ByteArrayResource(content) {
            @Override
            public String getFilename() {
                return name;
            }
        };
    }

    private static byte[] fontBytes(String name) {
        try (var in = new ClassPathResource("/fonts/" + name).getInputStream()) {
            return in.readAllBytes();
        } catch (IOException ex) {
            throw new BusinessException("Cannot render CV", HttpStatus.INTERNAL_SERVER_ERROR, "CV_RENDER_FAILED");
        }
    }
}
