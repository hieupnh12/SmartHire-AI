package com.smarthire.tenant.auth.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.smarthire.common.exception.GlobalExceptionHandler;
import com.smarthire.tenant.auth.dto.AcceptInvitationRequest;
import com.smarthire.tenant.auth.dto.InviteMemberRequest;
import com.smarthire.tenant.auth.dto.InviteMemberResponse;
import com.smarthire.tenant.auth.dto.UserResponse;
import com.smarthire.tenant.auth.service.MemberInvitationService;
import com.smarthire.tenant.auth.service.TenantUserService;
import java.time.Instant;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class TenantUserInvitationControllerTest {

    @Mock
    private TenantUserService tenantUserService;
    @Mock
    private MemberInvitationService memberInvitationService;

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(new TenantUserController(tenantUserService, memberInvitationService))
                .setControllerAdvice(new GlobalExceptionHandler())
                .setMessageConverters(new MappingJackson2HttpMessageConverter(objectMapper))
                .build();
    }

    @Test
    void invite_ValidRequest_ReturnsCreated() throws Exception {
        when(memberInvitationService.invite(any(InviteMemberRequest.class))).thenReturn(InviteMemberResponse.builder()
                .email("hr@se36.com")
                .fullName("HR User")
                .role("HR")
                .expiresAt(Instant.parse("2026-09-20T00:00:00Z"))
                .emailSent(false)
                .acceptUrl("http://se36.localhost:5173/invite/accept?token=abc")
                .build());

        mockMvc.perform(post("/api/v1/tenant/users/invitations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(InviteMemberRequest.builder()
                                .email("hr@se36.com")
                                .fullName("HR User")
                                .role("HR")
                                .build())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.email").value("hr@se36.com"));
    }

    @Test
    void accept_BlankToken_ReturnsBadRequest() throws Exception {
        mockMvc.perform(post("/api/v1/tenant/users/invitations/accept")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(AcceptInvitationRequest.builder()
                                .token(" ")
                                .password("secret1")
                                .build())))
                .andExpect(status().isBadRequest());
    }

    @Test
    void accept_ValidRequest_ReturnsOk() throws Exception {
        when(memberInvitationService.accept(any(AcceptInvitationRequest.class))).thenReturn(UserResponse.builder()
                .email("hr@se36.com")
                .fullName("HR User")
                .role("HR")
                .status("ACTIVE")
                .build());

        mockMvc.perform(post("/api/v1/tenant/users/invitations/accept")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(AcceptInvitationRequest.builder()
                                .token("raw-token")
                                .password("secret1")
                                .build())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.role").value("HR"));
    }
}
