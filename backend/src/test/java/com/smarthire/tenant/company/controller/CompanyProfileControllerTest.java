package com.smarthire.tenant.company.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.common.exception.GlobalExceptionHandler;
import com.smarthire.tenant.company.dto.CompanyProfileResponse;
import com.smarthire.tenant.company.dto.UpdateCompanyProfileRequest;
import com.smarthire.tenant.company.service.CompanyDirectoryService;
import com.smarthire.master.billing.dto.CheckoutResponse;
import com.smarthire.tenant.company.dto.RenewSubscriptionRequest;
import com.smarthire.tenant.company.dto.TenantSubscriptionQuotaResponse;
import com.smarthire.tenant.company.service.CompanyProfileService;
import com.smarthire.tenant.company.service.TenantSubscriptionQuotaService;
import org.springframework.test.util.ReflectionTestUtils;
import java.math.BigDecimal;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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

    @Mock
    private CompanyDirectoryService companyDirectoryService;

    @Mock
    private TenantSubscriptionQuotaService subscriptionQuotaService;

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        CompanyProfileController controller = new CompanyProfileController(companyProfileService, companyDirectoryService);
        ReflectionTestUtils.setField(controller, "subscriptionQuotaService", subscriptionQuotaService);
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

    @Test
    void renewAndAutoRenewAndInvoiceEndpoints_ReturnOk() throws Exception {
        TenantSubscriptionQuotaResponse quotaRes = TenantSubscriptionQuotaResponse.builder()
                .tenantCode("acme")
                .planCode("PROFESSIONAL")
                .planName("Professional")
                .autoRenew(false)
                .build();
        when(subscriptionQuotaService.renewSubscription(any(RenewSubscriptionRequest.class))).thenReturn(quotaRes);
        when(subscriptionQuotaService.updateAutoRenew(false)).thenReturn(quotaRes);
        when(subscriptionQuotaService.cancelPendingInvoice(12L)).thenReturn(quotaRes);
        when(subscriptionQuotaService.getInvoiceCheckoutDetails(12L)).thenReturn(
                CheckoutResponse.builder()
                        .invoiceId(12L)
                        .invoiceNumber("INV-202611-0012")
                        .amountVnd(BigDecimal.valueOf(36000000))
                        .status("PENDING")
                        .build()
        );

        mockMvc.perform(post("/api/v1/tenant/company/subscription/renew")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"years\":1}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.planCode").value("PROFESSIONAL"));

        mockMvc.perform(patch("/api/v1/tenant/company/subscription/auto-renew")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"autoRenew\":false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.autoRenew").value(false));

        mockMvc.perform(get("/api/v1/tenant/company/subscription/invoices/12/checkout"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.invoiceNumber").value("INV-202611-0012"));

        mockMvc.perform(post("/api/v1/tenant/company/subscription/invoices/12/cancel"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }
}
