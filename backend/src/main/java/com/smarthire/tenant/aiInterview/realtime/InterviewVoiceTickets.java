package com.smarthire.tenant.aiInterview.realtime;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.common.redis.RedisKeys;
import com.smarthire.multitenancy.context.TenantContext;
import com.smarthire.tenant.aiInterview.service.InterviewConversationService;
import java.time.Duration;
import java.util.List;
import java.util.UUID;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component
public class InterviewVoiceTickets {
    public record Identity(long interviewId, String tenant, String email, List<String> authorities) {}
    private final StringRedisTemplate redis;
    private final ObjectMapper mapper;
    private final InterviewConversationService conversation;
    public InterviewVoiceTickets(StringRedisTemplate redis, ObjectMapper mapper, InterviewConversationService conversation) {
        this.redis = redis; this.mapper = mapper; this.conversation = conversation;
    }
    public String issue(long id) {
        conversation.authorizeVoice(id);
        var auth = SecurityContextHolder.getContext().getAuthentication();
        var identity = new Identity(id, TenantContext.getCurrentTenant(), auth.getName(),
                auth.getAuthorities().stream().map(value -> value.getAuthority()).toList());
        String ticket = UUID.randomUUID().toString();
        try { redis.opsForValue().set(RedisKeys.interviewVoiceTicket(ticket), mapper.writeValueAsString(identity), Duration.ofSeconds(60)); }
        catch (Exception ex) { throw new IllegalStateException("Cannot issue voice connection ticket"); }
        return ticket;
    }
    public Identity consume(String ticket) {
        if (ticket == null || !ticket.matches("[a-f0-9-]{36}")) return null;
        try {
            String data = redis.opsForValue().getAndDelete(RedisKeys.interviewVoiceTicket(ticket));
            return data == null ? null : mapper.readValue(data, Identity.class);
        } catch (Exception ex) { return null; }
    }
}
