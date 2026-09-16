package com.smarthire.tenant.auth.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.common.exception.GlobalExceptionHandler;
import com.smarthire.tenant.auth.dto.CandidateLoginResponse;
import com.smarthire.tenant.auth.dto.CandidateProfileResponse;
import com.smarthire.tenant.auth.dto.GoogleLoginRequest;
import com.smarthire.tenant.auth.service.CandidateAuthService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class CandidateAuthControllerTest {

    @Mock
    private CandidateAuthService candidateAuthService;

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        CandidateAuthController controller = new CandidateAuthController(candidateAuthService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void loginWithGoogle_ValidRequest_ReturnsOk() throws Exception {
        GoogleLoginRequest request = new GoogleLoginRequest("mock-google-id-token");
        CandidateProfileResponse profile = new CandidateProfileResponse(
                1L, "candidate@example.com", "Nguyễn Văn A", "https://avatar.com/1.jpg", "CANDIDATE", "Candidate", "ACTIVE"
        );
        CandidateLoginResponse response = new CandidateLoginResponse(
                "mock-access-token", "mock-refresh-token", "Bearer", "acme", profile
        );

        when(candidateAuthService.authenticateWithGoogle(any(GoogleLoginRequest.class))).thenReturn(response);

        mockMvc.perform(post("/api/v1/tenant/auth/google")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.accessToken").value("mock-access-token"))
                .andExpect(jsonPath("$.data.candidate.email").value("candidate@example.com"));
    }

    @Test
    void loginWithGoogle_EmptyToken_ReturnsBadRequest() throws Exception {
        GoogleLoginRequest request = new GoogleLoginRequest("");

        mockMvc.perform(post("/api/v1/tenant/auth/google")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }
}
