package com.smarthire.master.system.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.master.system.dto.ClientCrashLogRequest;
import com.smarthire.master.system.service.TenantSystemLogService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class PublicClientLogControllerTest {

    @Mock
    private TenantSystemLogService systemLogService;

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        PublicClientLogController controller = new PublicClientLogController(systemLogService);
        this.mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    @Test
    @DisplayName("reportClientCrash - Happy Path returns HTTP 200")
    void reportClientCrash_happyPath() throws Exception {
        ClientCrashLogRequest req = ClientCrashLogRequest.builder()
                .tenantCode("ACME")
                .action("REACT_CRASH")
                .message("TypeError: Cannot read properties of undefined")
                .pageUrl("/recruiter/cv-screening")
                .userAgent("Mozilla/5.0")
                .stackTrace("Error: crash\n    at Component")
                .metadata(Map.of("component", "CvScreeningList"))
                .build();

        mockMvc.perform(post("/api/v1/public/logs/client-crash")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").value("SUCCESS"));

        verify(systemLogService).logClientError(
                any(), any(), any(), any(), any(), any(), any(), any(), any()
        );
    }
}
