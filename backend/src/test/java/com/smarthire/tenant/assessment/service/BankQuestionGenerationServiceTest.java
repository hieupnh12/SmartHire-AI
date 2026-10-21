package com.smarthire.tenant.assessment.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.common.exception.BusinessException;
import com.smarthire.common.redis.RedisService;
import com.smarthire.domain.enums.QuestionType;
import com.smarthire.domain.tenant.entity.User;
import com.smarthire.multitenancy.context.TenantContext;
import com.smarthire.tenant.aiInterview.ai.AiInterviewClient;
import com.smarthire.tenant.assessment.dto.request.BankGenerationRequest;
import com.smarthire.tenant.cv.service.CvAccess;
import jakarta.validation.Validation;
import jakarta.validation.ValidatorFactory;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.*;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessagePostProcessor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.mockito.ArgumentCaptor;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class BankQuestionGenerationServiceTest {
    final ObjectMapper json = new ObjectMapper();
    final CvAccess access = mock(CvAccess.class);
    final RedisService redis = mock(RedisService.class);
    final RabbitTemplate rabbit = mock(RabbitTemplate.class);
    final AiInterviewClient ai = mock(AiInterviewClient.class);
    final Map<String, String> state = new HashMap<>();
    ValidatorFactory validators;
    BankQuestionGenerationService service;
    BankGenerationRequest request = new BankGenerationRequest("Java", QuestionType.MCQ, "Medium", 1, "java", "");

    @BeforeEach void setup() {
        TenantContext.setCurrentTenant("acme");
        var user = new User(); user.setId(1L);
        when(access.staff()).thenReturn(true); lenient().when(access.actor()).thenReturn(user);
        lenient().when(redis.get(anyString())).thenAnswer(call -> Optional.ofNullable(state.get(call.getArgument(0))));
        doAnswer(call -> { state.put(call.getArgument(0), call.getArgument(1)); return null; }).when(redis).set(anyString(), anyString(), any());
        lenient().when(redis.setIfAbsent(anyString(), anyString(), any())).thenReturn(true);
        validators = Validation.buildDefaultValidatorFactory();
        service = new BankQuestionGenerationService(access, redis, rabbit, json, ai, validators.getValidator());
    }
    @AfterEach void cleanup() { TenantContext.clear(); validators.close(); }

    @Test void queuesTenantJobAndReturnsValidatedDraftWithoutSavingQuestions() throws Exception {
        var pending = service.start(request);
        var header = ArgumentCaptor.forClass(MessagePostProcessor.class);
        verify(rabbit).convertAndSend(eq(""), eq("smarthire.assessment.bank.generate"), eq(pending.id()), header.capture());
        var message = header.getValue().postProcessMessage(new Message(new byte[0]));
        assertThat(message.getMessageProperties().getHeader("X-Tenant-ID").toString()).isEqualTo("acme");
        when(ai.generateAssessment(anyString(), any())).thenReturn(json.readTree("""
                {"question":{"questionText":"Which Java keyword declares a class?","points":5,"questionOrder":0,
                "questionType":"MCQ","options":[{"optionText":"class","correct":true},
                {"optionText":"def","correct":false},{"optionText":"function","correct":false},{"optionText":"let","correct":false}]}}
                """));
        service.process(pending.id());
        var ready = service.status(pending.id());
        assertThat(ready.status()).isEqualTo("READY");
        assertThat(ready.questions()).hasSize(1);
        assertThat(ready.questions().getFirst().skill()).isEqualTo("Java");
        assertThat(ready.questions().getFirst().difficulty()).isEqualTo("Medium");
        service.process(pending.id());
        verify(ai, times(1)).generateAssessment(anyString(), any());
    }

    @Test void invalidAiOutputProducesSafeFailure() throws Exception {
        var pending = service.start(request);
        when(ai.generateAssessment(anyString(), any())).thenReturn(json.readTree("{\"question\":{\"questionText\":\"bad\"}}"));
        service.process(pending.id());
        assertThat(service.status(pending.id()).status()).isEqualTo("FAILED");
        assertThat(service.status(pending.id()).questions()).isEmpty();
    }

    @Test void draftsAreIsolatedByTenantAndOwner() {
        var pending = service.start(request);
        var other = new User(); other.setId(2L); when(access.actor()).thenReturn(other);
        assertThatThrownBy(() -> service.status(pending.id())).isInstanceOf(BusinessException.class);
        TenantContext.setCurrentTenant("other");
        assertThatThrownBy(() -> service.status(pending.id())).isInstanceOf(BusinessException.class);
    }

    @Test void candidateCannotQueueGeneration() {
        when(access.staff()).thenReturn(false);
        assertThatThrownBy(() -> service.start(request)).isInstanceOf(BusinessException.class);
        verifyNoInteractions(rabbit, ai);
    }

    @Test void brokerFailureDoesNotReturnPendingJob() {
        doThrow(new IllegalStateException("offline")).when(rabbit).convertAndSend(anyString(), anyString(), anyString(), any(MessagePostProcessor.class));
        assertThatThrownBy(() -> service.start(request)).isInstanceOf(BusinessException.class);
        verify(redis).delete(anyString());
    }
}
