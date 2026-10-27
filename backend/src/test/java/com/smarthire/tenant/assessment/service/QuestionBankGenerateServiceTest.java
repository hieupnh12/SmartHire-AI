package com.smarthire.tenant.assessment.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.tenant.entity.User;
import com.smarthire.tenant.aiInterview.ai.AiInterviewClient;
import com.smarthire.tenant.assessment.ai.GeneratedBankQuestionBatch;
import com.smarthire.tenant.assessment.ai.GeneratedBankQuestionBatch.GeneratedBankQuestion;
import com.smarthire.tenant.assessment.ai.GeneratedBankQuestionBatch.GeneratedOption;
import com.smarthire.domain.tenant.repository.QuestionRepository;
import com.smarthire.tenant.assessment.dto.request.QuestionBankGenerateRequest;
import com.smarthire.tenant.cv.service.CvAccess;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;

@ExtendWith(MockitoExtension.class)
class QuestionBankGenerateServiceTest {

    @Mock AiInterviewClient ai;
    @Mock CvAccess access;
    @Mock QuestionRepository questions;
    ObjectMapper json = new ObjectMapper();
    QuestionBankGenerateService service;

    @BeforeEach
    void setUp() {
        service = new QuestionBankGenerateService(ai, access, json, questions);
        when(access.staff()).thenReturn(true);
        when(access.actor()).thenReturn(new User());
        lenient().when(questions.findSimilarByText(any(), any(Pageable.class))).thenReturn(List.of());
    }

    @Test
    void mapsStructuredMcqEntityToBankDraft() {
        var batch = new GeneratedBankQuestionBatch(List.of(
                new GeneratedBankQuestion("What is JVM?", 5, "Runtime",
                        List.of(
                                new GeneratedOption("Java Virtual Machine", true),
                                new GeneratedOption("Java Very Much", false),
                                new GeneratedOption("Just Void Method", false),
                                new GeneratedOption("Joint Version Manager", false)),
                        null)));
        when(ai.generateBankQuestions(any(), any(), eq(GeneratedBankQuestionBatch.class))).thenReturn(batch);

        var drafts = service.generate(new QuestionBankGenerateRequest("Java", "Easy", "MCQ", 1, null, "en"));

        assertEquals(1, drafts.size());
        assertEquals("What is JVM?", drafts.get(0).question().questionText());
        assertEquals(1, drafts.get(0).question().options().stream().filter(o -> o.correct()).count());
        assertTrue(drafts.get(0).authoringMetadata().path("aiGenerated").asBoolean());
    }

    @Test
    void rejectsEmptyBatch() {
        when(ai.generateBankQuestions(any(), any(), eq(GeneratedBankQuestionBatch.class)))
                .thenReturn(new GeneratedBankQuestionBatch(List.of()));
        var ex = assertThrows(BusinessException.class,
                () -> service.generate(new QuestionBankGenerateRequest("Java", "Easy", "MCQ", 2, null, "vi")));
        assertEquals("QUESTION_GEN_INVALID", ex.getCode());
    }
}
