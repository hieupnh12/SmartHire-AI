package com.smarthire.tenant.cv;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.tenant.cv.service.CvPdfExportService;
import org.junit.jupiter.api.Test;

class CvPdfExportServiceTest {

    @Test
    void wrapsSheetWithBundledFontsAndKeepsCssInsideStyleTag() {
        String html = new CvPdfExportService("http://localhost:3000").documentFor("<div class=\"cv-print-area\">CV</div>", ".a{}</style><script>x</script>");

        assertThat(html)
                .startsWith("<!doctype html>")
                .contains("url(\"Arial.ttf\")")
                .contains("<body><div class=\"cv-print-area\">CV</div></body>")
                .doesNotContain("</style><script>");
    }

    @Test
    void reportsUnavailableWhenGotenbergIsDown() {
        CvPdfExportService service = new CvPdfExportService("http://127.0.0.1:1");

        assertThatThrownBy(() -> service.export("<div>CV</div>", ""))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("PDF service is unavailable");
    }
}
