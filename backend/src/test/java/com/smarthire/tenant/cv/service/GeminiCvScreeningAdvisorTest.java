package com.smarthire.tenant.cv.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.tenant.cv.ai.GeminiCvAiClient;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class GeminiCvScreeningAdvisorTest {
    @Test
    void parsesStructuredRecruiterInsightsAndRespectsFormulaGate() throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        GeminiCvAiClient ai = mock(GeminiCvAiClient.class);
        when(ai.configured()).thenReturn(true);
        when(ai.completeJson(anyString(), anyString())).thenReturn("""
                {
                  "passed": true,
                  "verdict": "Ứng viên học tại Đại học FPT, có nền tảng Java và Spring Boot nhưng mới làm dự án khoảng 7 tháng, phù hợp Fresher hơn Middle.",
                  "advice": "Nên phỏng vấn kiểm tra khả năng xử lý API và cơ sở dữ liệu thực tế trước khi cân nhắc.",
                  "strengths": ["Có dự án JavaOJT thực tế", "Nắm được Spring Boot và SQL"],
                  "risks": ["Thiếu kinh nghiệm vận hành Docker thực tế", "Kinh nghiệm còn ít so với vị trí Middle"],
                  "interviewQuestions": ["Bạn đã thiết kế API nào trong JavaOJT?", "Bạn xử lý transaction khi có lỗi DB như thế nào?"],
                  "candidateAdvice": "Bạn nên bổ sung thêm minh chứng dự án có dùng Docker."
                }
                """);

        GeminiCvScreeningAdvisor advisor = new GeminiCvScreeningAdvisor(ai, mapper);
        Optional<CvScreeningAdvisor.Decision> decision = advisor.decide(mapper.readTree("{\"score\":82.93}"), false);

        assertThat(decision).isPresent();
        assertThat(decision.get().passed()).isFalse();
        assertThat(decision.get().verdict()).contains("Đại học FPT").contains("Fresher");
        assertThat(decision.get().advice()).contains("phỏng vấn kiểm tra");
        assertThat(decision.get().strengths()).containsExactly("Có dự án JavaOJT thực tế", "Nắm được Spring Boot và SQL");
        assertThat(decision.get().risks()).hasSize(2);
        assertThat(decision.get().interviewQuestions()).hasSize(2);
        assertThat(decision.get().candidateAdvice()).contains("Docker");
    }
}

