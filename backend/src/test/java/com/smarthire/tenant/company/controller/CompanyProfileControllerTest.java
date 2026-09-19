package com.smarthire.tenant.company.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.common.exception.GlobalExceptionHandler;
import com.smarthire.tenant.company.dto.CompanyProfileResponse;
import com.smarthire.tenant.company.dto.UpdateCompanyProfileRequest;
import com.smarthire.tenant.company.service.CompanyProfileService;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class CompanyProfileControllerTest {

    @Mock
    private CompanyProfileService companyProfileService;

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        CompanyProfileController controller = new CompanyProfileController(companyProfileService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    private CompanyProfileResponse acmeProfile() {
        return CompanyProfileResponse.builder()
                .tenantId("acme")
                .companyName("Acme Corporation")
                .subdomain("acme")
                .description("Enterprise multi-tenant hiring platform")
                .logoUrl("https://cdn.smarthire.ai/acme/logo.png")
                .website("https://acme.vn")
                .address("Tầng 12, Enterprise Tech Tower, Hà Nội")
                .industry("Software")
                .companySize("100 - 500")
                .verified(true)
                .build();
    }

    @Test
    void getProfile_ReturnsOk() throws Exception {
        when(companyProfileService.getProfile()).thenReturn(acmeProfile());

        mockMvc.perform(get("/api/v1/tenant/company/profile"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.tenantId").value("acme"))
                .andExpect(jsonPath("$.data.companyName").value("Acme Corporation"))
                .andExpect(jsonPath("$.data.verified").value(true));
    }

    @Test
    void updateProfile_ValidRequest_ReturnsOk() throws Exception {
        UpdateCompanyProfileRequest request = UpdateCompanyProfileRequest.builder()
                .companyName("Acme Corporation")
                .website("https://acme.vn")
                .build();

        when(companyProfileService.updateProfile(any(UpdateCompanyProfileRequest.class))).thenReturn(acmeProfile());

        mockMvc.perform(put("/api/v1/tenant/company/profile")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.website").value("https://acme.vn"));
    }

    @Test
    void updateProfile_InvalidWebsite_ReturnsBadRequest() throws Exception {
        UpdateCompanyProfileRequest request = UpdateCompanyProfileRequest.builder()
                .companyName("Acme Corporation")
                .website("acme.vn")
                .build();

        mockMvc.perform(put("/api/v1/tenant/company/profile")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.website").exists());
    }

    @Test
    void updateProfile_BlankCompanyName_ReturnsBadRequest() throws Exception {
        UpdateCompanyProfileRequest request = UpdateCompanyProfileRequest.builder()
                .companyName("  ")
                .build();

        mockMvc.perform(put("/api/v1/tenant/company/profile")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }
}
