package com.smarthire.tenant.cv;

import static org.assertj.core.api.Assertions.assertThat;

import com.smarthire.tenant.cv.dto.CvModels.BuilderDetail;
import com.smarthire.tenant.cv.dto.CvModels.BuilderItem;
import com.smarthire.tenant.cv.dto.CvModels.BuilderPersonalInfo;
import com.smarthire.tenant.cv.dto.CvModels.BuilderSection;
import com.smarthire.tenant.cv.dto.CvModels.CvBuilderData;
import com.smarthire.tenant.cv.service.CvBuilderPdfRenderer;
import java.util.List;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.junit.jupiter.api.Test;

class CvBuilderPdfRendererTest {

    @Test
    void rendersVietnameseTextThatCanBeExtractedAgain() throws Exception {
        CvBuilderData data = new CvBuilderData(
                "basic",
                "#0f766e",
                null,
                "vi",
                new BuilderPersonalInfo("Nguyễn Thị Hương", "Lập trình viên Backend", "huong@example.com",
                        "0901234567", "Hà Nội", null, "<p>Đam mê <b>Java</b> &amp; Spring</p>", null,
                        "github.com/huong", null, List.of(new BuilderDetail("Quốc tịch", "Việt Nam")), "/cv-assets/fpt-software-logo.jpg", null),
                List.of(
                        new BuilderSection("s4", "skills", "Kỹ năng", true, List.of(
                                new BuilderItem("i4", "Backend", null, null, "Java, Spring Boot", 5, null))),
                        new BuilderSection("s1", "experience", "Kinh nghiệm làm việc", true, List.of(
                                new BuilderItem("i1", "Công ty Phần mềm Đông Á", "Kỹ sư phần mềm", "2022 - nay",
                                        "<ul><li>Xây dựng API thanh toán</li><li>Tối ưu truy vấn MySQL</li></ul>", null, null))),
                        new BuilderSection("s3", "languages", "Ngoại ngữ", true, List.of(
                                new BuilderItem("i3", "Tiếng Anh", "IELTS 7.0", null, null, 4, null))),
                        new BuilderSection("s2", "custom", "Mục ẩn", false, List.of(
                                new BuilderItem("i2", "Không được in", null, null, null, null, null)))));

        byte[] pdf = new CvBuilderPdfRenderer().render(data);

        try (PDDocument document = Loader.loadPDF(pdf)) {
            String text = new PDFTextStripper().getText(document);
            assertThat(text)
                    .contains("Nguyễn Thị Hương")
                    .contains("Kinh nghiệm làm việc")
                    .contains("Đam mê Java & Spring")
                    .contains("Tối ưu truy vấn MySQL")
                    .contains("Tiếng Anh")
                    .contains("●●●●○")
                    .contains("github.com/huong")
                    .contains("Thành thạo")
                    .contains("Quốc tịch: Việt Nam")
                    .contains("Nguyễn Thị Hương – CV")
                    .contains("Trang 1")
                    .doesNotContain("Không được in");
        }
    }
}
