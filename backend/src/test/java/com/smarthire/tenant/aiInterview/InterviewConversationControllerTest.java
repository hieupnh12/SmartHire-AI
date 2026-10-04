package com.smarthire.tenant.aiInterview;

import com.smarthire.messaging.TenantJobExecutor;
import com.smarthire.multitenancy.context.TenantContext;
import com.smarthire.tenant.aiInterview.ai.AiInterviewClient;
import com.smarthire.tenant.aiInterview.controller.InterviewConversationController;
import com.smarthire.tenant.aiInterview.dto.response.ConversationResponse;
import com.smarthire.tenant.aiInterview.realtime.InterviewVoiceTickets;
import com.smarthire.tenant.aiInterview.service.*;
import java.util.List;
import java.util.function.Consumer;
import org.junit.jupiter.api.Test;
import org.springframework.core.task.SyncTaskExecutor;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class InterviewConversationControllerTest {
    InterviewConversationService conversation = mock(InterviewConversationService.class);
    TenantJobExecutor tenants = mock(TenantJobExecutor.class);
    org.springframework.test.web.servlet.MockMvc mvc() {
        return MockMvcBuilders.standaloneSetup(new InterviewConversationController(conversation, mock(InterviewVoiceTickets.class),
                tenants, new SyncTaskExecutor(), mock(InterviewConversationRecordingService.class))).build();
    }
    void executeTenant() {
        TenantContext.setCurrentTenant("acme");
        doAnswer(call -> { ((Runnable) call.getArgument(1)).run(); return null; }).when(tenants).execute(eq("acme"), any());
    }
    @Test void sseAcknowledgesTheCommittedHistoryAndDisablesProxyBuffering() throws Exception {
        var response = new ConversationResponse(21L, 1, 3, false, "English", List.of());
        when(conversation.turn(eq(11L), any(), any())).thenAnswer(call -> {
            @SuppressWarnings("unchecked") Consumer<String> delta = call.getArgument(2); delta.accept("Hello"); return response;
        });
        executeTenant(); var mvc = mvc();
        var result = mvc.perform(post("/api/v1/ai-interviews/11/conversation/turns").contentType(MediaType.APPLICATION_JSON)
                .content("{\"requestId\":\"12345678-1234-1234-1234-123456789012\",\"content\":\"REST\"}"))
                .andExpect(request().asyncStarted()).andReturn();
        mvc.perform(asyncDispatch(result)).andExpect(status().isOk()).andExpect(header().string("X-Accel-Buffering", "no"))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("event:delta")))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("event:done")));
        assertThat(TenantContext.getCurrentTenant()).isNull();
    }
    @Test void failedStreamDoesNotExposeProviderSecrets() throws Exception {
        when(conversation.turn(eq(11L), any(), any())).thenThrow(new AiInterviewClient.ProviderException("private provider body"));
        executeTenant(); var mvc = mvc();
        var result = mvc.perform(post("/api/v1/ai-interviews/11/conversation/turns").contentType(MediaType.APPLICATION_JSON)
                .content("{\"requestId\":\"12345678-1234-1234-1234-123456789012\",\"content\":\"REST\"}"))
                .andExpect(request().asyncStarted()).andReturn();
        String body = mvc.perform(asyncDispatch(result)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertThat(body).contains("event:error").doesNotContain("private provider body");
    }
    @Test void invalidTurnIsRejectedBeforeAnyProviderWork() throws Exception {
        mvc().perform(post("/api/v1/ai-interviews/11/conversation/turns").contentType(MediaType.APPLICATION_JSON)
                .content("{\"requestId\":\"invalid\",\"content\":\"\"}")).andExpect(status().isBadRequest());
        verifyNoInteractions(conversation, tenants);
    }
}
