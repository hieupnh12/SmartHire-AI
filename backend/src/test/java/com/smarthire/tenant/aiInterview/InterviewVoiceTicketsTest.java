package com.smarthire.tenant.aiInterview;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.common.redis.RedisKeys;
import com.smarthire.tenant.aiInterview.realtime.InterviewVoiceTickets;
import com.smarthire.tenant.aiInterview.service.InterviewConversationService;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class InterviewVoiceTicketsTest {
    @Test void ticketIsConsumedAtomicallyAndCannotBeReused() {
        var redis = mock(StringRedisTemplate.class);
        @SuppressWarnings("unchecked") ValueOperations<String, String> values = mock(ValueOperations.class);
        when(redis.opsForValue()).thenReturn(values);
        var tickets = new InterviewVoiceTickets(redis, new ObjectMapper(), mock(InterviewConversationService.class));
        String ticket = "12345678-1234-1234-1234-123456789012";
        when(values.getAndDelete(RedisKeys.interviewVoiceTicket(ticket))).thenReturn(
                "{\"interviewId\":11,\"tenant\":\"acme\",\"email\":\"candidate@example.test\",\"authorities\":[\"ROLE_CANDIDATE\"]}", null);
        assertThat(tickets.consume(ticket).tenant()).isEqualTo("acme"); assertThat(tickets.consume(ticket)).isNull();
        assertThat(tickets.consume("invalid")).isNull();
        verify(values, times(2)).getAndDelete(RedisKeys.interviewVoiceTicket(ticket));
    }
}
