package com.smarthire.tenant.auth.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.common.exception.GlobalExceptionHandler;
import com.smarthire.tenant.auth.dto.*;
import com.smarthire.tenant.auth.service.TenantAuthService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class TenantAuthControllerTest {

    @Mock
    private TenantAuthService tenantAuthService;

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        TenantAuthController controller = new TenantAuthController(tenantAuthService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void login_Success_ReturnsOk() throws Exception {
        LoginRequest request = new LoginRequest("recruiter@acme.com", "Password123");
        UserResponse user = UserResponse.builder()
                .id(1L)
                .email("recruiter@acme.com")
                .fullName("Jane Doe")
                .role("RECRUITER")
                .permissions(List.of("JOBS", "APPLICANTS"))
                .build();

        LoginResponse response = LoginResponse.builder()
                .accessToken("access-xyz")
                .refreshToken("refresh-xyz")
                .tokenType("Bearer")
                .user(user)
                .tenantId("acme")
                .subdomain("acme")
                .build();

        when(tenantAuthService.login(any(LoginRequest.class))).thenReturn(response);

        mockMvc.perform(post("/api/v1/tenant/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.accessToken").value("access-xyz"))
                .andExpect(jsonPath("$.data.refreshToken").value("refresh-xyz"))
                .andExpect(jsonPath("$.data.tenantId").value("acme"))
                .andExpect(jsonPath("$.data.user.email").value("recruiter@acme.com"));
    }

    @Test
    void refresh_Success_ReturnsOk() throws Exception {
        TenantRefreshTokenRequest request = new TenantRefreshTokenRequest("valid-refresh-token");
        LoginResponse response = LoginResponse.builder()
                .accessToken("new-access-xyz")
                .refreshToken("new-refresh-xyz")
                .tokenType("Bearer")
                .tenantId("acme")
                .subdomain("acme")
                .build();

        when(tenantAuthService.refreshToken(any(TenantRefreshTokenRequest.class))).thenReturn(response);

        mockMvc.perform(post("/api/v1/tenant/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.accessToken").value("new-access-xyz"))
                .andExpect(jsonPath("$.data.refreshToken").value("new-refresh-xyz"));
    }

    @Test
    void logout_Success_ReturnsOk() throws Exception {
        TenantLogoutRequest request = new TenantLogoutRequest("refresh-token-xyz");

        doNothing().when(tenantAuthService).logout(eq("Bearer test-token"), any(TenantLogoutRequest.class));

        mockMvc.perform(post("/api/v1/tenant/auth/logout")
                        .header("Authorization", "Bearer test-token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Đăng xuất thành công"));
    }

    @Test
    void forgotPassword_Success_ReturnsOk() throws Exception {
        ForgotPasswordRequest request = new ForgotPasswordRequest("user@acme.com");

        doNothing().when(tenantAuthService).forgotPassword(any(ForgotPasswordRequest.class));

        mockMvc.perform(post("/api/v1/tenant/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    void resetPassword_Success_ReturnsOk() throws Exception {
        ResetPasswordRequest request = new ResetPasswordRequest("user@acme.com", "123456", "NewPassword123");

        doNothing().when(tenantAuthService).resetPassword(any(ResetPasswordRequest.class));

        mockMvc.perform(post("/api/v1/tenant/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    void changePassword_Success_ReturnsOk() throws Exception {
        ChangePasswordRequest request = new ChangePasswordRequest("OldPassword123", "NewPassword456");

        doNothing().when(tenantAuthService).changePassword(eq("Bearer test-token"), any(ChangePasswordRequest.class));

        mockMvc.perform(post("/api/v1/tenant/auth/change-password")
                        .header("Authorization", "Bearer test-token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    void getCurrentUser_Success_ReturnsOk() throws Exception {
        UserResponse user = UserResponse.builder()
                .id(2L)
                .email("admin@acme.com")
                .fullName("Admin User")
                .role("TENANT_ADMIN")
                .build();

        when(tenantAuthService.getCurrentUser("Bearer test-token")).thenReturn(user);

        mockMvc.perform(get("/api/v1/tenant/auth/me")
                        .header("Authorization", "Bearer test-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.email").value("admin@acme.com"))
                .andExpect(jsonPath("$.data.role").value("TENANT_ADMIN"));
    }
}
