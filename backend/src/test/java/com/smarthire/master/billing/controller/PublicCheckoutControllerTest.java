package com.smarthire.master.billing.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.common.exception.GlobalExceptionHandler;
import com.smarthire.domain.master.entity.SubscriptionPlan;
import com.smarthire.domain.master.repository.SubscriptionPlanRepository;
import com.smarthire.master.billing.dto.CheckoutRequest;
import com.smarthire.master.billing.dto.CheckoutResponse;
import com.smarthire.master.billing.service.MasterBillingService;
import com.smarthire.master.subscription.dto.SubscriptionPlanResponse;
import com.smarthire.master.subscription.mapper.SubscriptionPlanMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class PublicCheckoutControllerTest {

    @Mock
    private MasterBillingService billingService;

    @Mock
    private SubscriptionPlanRepository planRepository;

    @Mock
    private SubscriptionPlanMapper planMapper;

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        PublicCheckoutController controller = new PublicCheckoutController(billingService, planRepository, planMapper);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void submitCheckout_ValidRequest_ReturnsCreated() throws Exception {
        CheckoutRequest request = CheckoutRequest.builder()
                .planCode("STARTER")
                .billingCycle("MONTHLY")
                .workspaceName("Tech Corp")
                .subdomain("techcorp")
                .adminFullName("Nguyen Van A")
                .adminEmail("nguyenvana@techcorp.vn")
                .adminPhone("0987654321")
                .taxCode("0102030405")
                .companyLegalName("Cong Ty TNHH Tech Corp")
                .billingAddress("123 Duy Tan, Cau Giay, Ha Noi")
                .notes("Test checkout")
                .build();

        CheckoutResponse response = CheckoutResponse.builder()
                .invoiceId(101L)
                .invoiceNumber("INV-202609-0001")
                .tenantId(202L)
                .tenantCode("techcorp")
                .subdomain("techcorp")
                .planName("Gói Khởi Động (Starter)")
                .planCode("STARTER")
                .billingCycle("MONTHLY")
                .amountVnd(new BigDecimal("1200000"))
                .currency("VND")
                .status("PENDING")
                .bankName("Techcombank (TCB)")
                .accountNumber("190388889999")
                .accountName("CONG TY CP CONG NGHE SMARTHIRE VIET NAM")
                .transferSyntax("SH INV-202609-0001")
                .qrUrl("https://img.vietqr.io/image/TCB-190388889999-compact2.png")
                .createdAt(LocalDateTime.now())
                .build();

        when(billingService.checkout(any(CheckoutRequest.class))).thenReturn(response);

        mockMvc.perform(post("/api/v1/public/checkout")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.invoiceId").value(101))
                .andExpect(jsonPath("$.data.invoiceNumber").value("INV-202609-0001"))
                .andExpect(jsonPath("$.data.amountVnd").value(1200000))
                .andExpect(jsonPath("$.data.currency").value("VND"))
                .andExpect(jsonPath("$.data.status").value("PENDING"))
                .andExpect(jsonPath("$.data.bankName").value("Techcombank (TCB)"))
                .andExpect(jsonPath("$.data.accountNumber").value("190388889999"))
                .andExpect(jsonPath("$.data.transferSyntax").value("SH INV-202609-0001"));
    }

    @Test
    void submitCheckout_InvalidSubdomain_ReturnsBadRequest() throws Exception {
        CheckoutRequest request = CheckoutRequest.builder()
                .planCode("STARTER")
                .billingCycle("MONTHLY")
                .workspaceName("Tech Corp")
                .subdomain("INVALID_SUBDOMAIN_WITH_CAPS")
                .adminFullName("Nguyen Van A")
                .adminEmail("nguyenvana@techcorp.vn")
                .adminPhone("0987654321")
                .build();

        mockMvc.perform(post("/api/v1/public/checkout")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void submitCheckout_MissingRequiredFields_ReturnsBadRequest() throws Exception {
        CheckoutRequest request = CheckoutRequest.builder()
                .planCode("")
                .workspaceName("")
                .build();

        mockMvc.perform(post("/api/v1/public/checkout")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void getPublicPlans_ReturnsActivePlansWithVndPricing() throws Exception {
        SubscriptionPlan plan = SubscriptionPlan.builder()
                .id(1L)
                .code("STARTER")
                .name("Gói Khởi Động")
                .priceMonthly(new BigDecimal("49.00"))
                .priceYearly(new BigDecimal("490.00"))
                .priceMonthlyVnd(new BigDecimal("1200000"))
                .priceYearlyVnd(new BigDecimal("12000000"))
                .maxJobs(5)
                .maxCvParses(100)
                .status("ACTIVE")
                .build();

        SubscriptionPlanResponse planResp = SubscriptionPlanResponse.builder()
                .id(1L)
                .code("STARTER")
                .name("Gói Khởi Động")
                .priceMonthly(new BigDecimal("49.00"))
                .priceYearly(new BigDecimal("490.00"))
                .priceMonthlyVnd(new BigDecimal("1200000"))
                .priceYearlyVnd(new BigDecimal("12000000"))
                .maxJobs(5)
                .maxCvParses(100)
                .status("ACTIVE")
                .build();

        when(planRepository.findByStatusOrderByPriceMonthlyVndAsc("ACTIVE")).thenReturn(List.of(plan));
        when(planMapper.toResponse(plan)).thenReturn(planResp);

        mockMvc.perform(get("/api/v1/public/checkout/plans"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].code").value("STARTER"))
                .andExpect(jsonPath("$.data[0].priceMonthlyVnd").value(1200000))
                .andExpect(jsonPath("$.data[0].priceYearlyVnd").value(12000000));
    }
}
