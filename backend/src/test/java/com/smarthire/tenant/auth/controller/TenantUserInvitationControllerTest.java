package com.smarthire.tenant.auth.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.smarthire.common.exception.GlobalExceptionHandler;
import com.smarthire.tenant.auth.dto.AcceptInvitationRequest;
import com.smarthire.tenant.auth.dto.InviteMemberRequest;
import com.smarthire.tenant.auth.dto.InviteMemberResponse;
import com.smarthire.tenant.auth.dto.PendingInvitationResponse;
import com.smarthire.tenant.auth.dto.UpdateUserStatusRequest;
import com.smarthire.tenant.auth.dto.UserResponse;
import com.smarthire.domain.enums.UserStatus;
import com.smarthire.tenant.auth.service.MemberInvitationService;
import com.smarthire.tenant.auth.service.TenantUserService;
import com.smarthire.tenant.job.service.JobAssignmentService;
import java.time.Instant;
import java.util.List;
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
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class TenantUserInvitationControllerTest {

    @Mock
    private TenantUserService tenantUserService;
    @Mock
    private MemberInvitationService memberInvitationService;
    @Mock
    private JobAssignmentService jobAssignmentService;

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(new TenantUserController(tenantUserService, memberInvitationService, jobAssignmentService))
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
                                .password("secret123")
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
                                .password("secret123")
                                .build())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.role").value("HR"));
    }

    @Test
    void updateStatus_ReturnsOk() throws Exception {
        when(tenantUserService.updateStatus(eq(2L), any(UpdateUserStatusRequest.class)))
                .thenReturn(UserResponse.builder().id(2L).email("hr@se36.com").status("LOCKED").build());

        mockMvc.perform(patch("/api/v1/tenant/users/2/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(UpdateUserStatusRequest.builder()
                                .status(UserStatus.LOCKED)
                                .build())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("LOCKED"));
    }

    @Test
    void listResendRevokeInvitations_ReturnOk() throws Exception {
        when(memberInvitationService.list("PENDING")).thenReturn(List.of(
                PendingInvitationResponse.builder().id(5L).email("new@se36.com").status("PENDING").build()));
        when(memberInvitationService.resend(5L)).thenReturn(
                InviteMemberResponse.builder().email("new@se36.com").emailSent(true).build());

        mockMvc.perform(get("/api/v1/tenant/users/invitations").param("status", "PENDING"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].email").value("new@se36.com"));

        mockMvc.perform(post("/api/v1/tenant/users/invitations/5/resend"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.emailSent").value(true));

        mockMvc.perform(delete("/api/v1/tenant/users/invitations/5"))
                .andExpect(status().isOk());
        verify(memberInvitationService).revoke(5L);
    }
}
