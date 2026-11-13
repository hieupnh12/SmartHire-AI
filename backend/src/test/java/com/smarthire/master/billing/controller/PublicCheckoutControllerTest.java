package com.smarthire.master.billing.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.common.exception.GlobalExceptionHandler;
import com.smarthire.domain.master.entity.SubscriptionPlan;
import com.smarthire.domain.master.repository.SubscriptionPlanRepository;
import com.smarthire.master.billing.dto.CheckoutRequest;
import com.smarthire.master.billing.dto.CheckoutResponse;
import com.smarthire.master.billing.dto.PublicOrderLookupResponse;
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
                .billingAddress("Tầng 13, Tòa nhà FPT, Quận Ngũ Hành Sơn, TP. Đà Nẵng")
                .notes("Test checkout")
                .termsAccepted(true)
                .termsVersion("v2026.10")
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
                .bankName("Ngân hàng TMCP Tiên Phong (TPBank)")
                .bankBranch("Chi nhánh Đà Nẵng")
                .accountNumber("07744348801")
                .accountName("NGUYEN NHAT SINH")
                .transferSyntax("SH INV-202609-0001")
                .qrUrl("https://img.vietqr.io/image/TPBank-07744348801-compact2.png")
                .termsAccepted(true)
                .termsVersion("v2026.10")
                .createdAt(LocalDateTime.now())
                .build();

        when(billingService.checkout(any(CheckoutRequest.class), any(), any())).thenReturn(response);

        mockMvc.perform(post("/api/v1/public/checkout")
                        .header("X-Forwarded-For", "203.113.152.10")
                        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.invoiceId").value(101))
                .andExpect(jsonPath("$.data.invoiceNumber").value("INV-202609-0001"))
                .andExpect(jsonPath("$.data.amountVnd").value(1200000))
                .andExpect(jsonPath("$.data.currency").value("VND"))
                .andExpect(jsonPath("$.data.status").value("PENDING"))
                .andExpect(jsonPath("$.data.bankName").value("Ngân hàng TMCP Tiên Phong (TPBank)"))
                .andExpect(jsonPath("$.data.bankBranch").value("Chi nhánh Đà Nẵng"))
                .andExpect(jsonPath("$.data.accountNumber").value("07744348801"))
                .andExpect(jsonPath("$.data.transferSyntax").value("SH INV-202609-0001"))
                .andExpect(jsonPath("$.data.termsAccepted").value(true))
                .andExpect(jsonPath("$.data.termsVersion").value("v2026.10"));
    }

    @Test
    void submitCheckout_TermsNotAccepted_ReturnsBadRequest() throws Exception {
        CheckoutRequest request = CheckoutRequest.builder()
                .planCode("STARTER")
                .billingCycle("YEARLY")
                .workspaceName("Tech Corp")
                .subdomain("techcorp")
                .adminFullName("Nguyen Van A")
                .adminEmail("nguyenvana@techcorp.vn")
                .adminPhone("0987654321")
                .termsAccepted(false)
                .build();

        mockMvc.perform(post("/api/v1/public/checkout")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
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
                .termsAccepted(true)
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
                .priceYearly(new BigDecimal("12000000"))
                .maxJobs(5)
                .maxCvParses(100)
                .status("ACTIVE")
                .build();

        SubscriptionPlanResponse planResp = SubscriptionPlanResponse.builder()
                .id(1L)
                .code("STARTER")
                .name("Gói Khởi Động")
                .priceYearly(new BigDecimal("12000000"))
                .maxJobs(5)
                .maxCvParses(100)
                .status("ACTIVE")
                .build();

        when(planRepository.findByStatusAndArchivedFalseAndCustomFalseOrderByPriceYearlyAsc("ACTIVE")).thenReturn(List.of(plan));
        when(planMapper.toResponse(plan)).thenReturn(planResp);

        mockMvc.perform(get("/api/v1/public/checkout/plans"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].code").value("STARTER"))
                .andExpect(jsonPath("$.data[0].priceYearly").value(12000000));
    }

    @Test
    void lookupOrders_ByEmail_ReturnsOrderList() throws Exception {
        PublicOrderLookupResponse order = PublicOrderLookupResponse.builder()
                .invoiceId(101L)
                .invoiceNumber("INV-202609-0001")
                .planName("Gói Chuyên Nghiệp")
                .planCode("PROFESSIONAL")
                .subdomain("techcorp")
                .workspaceName("Tech Corp")
                .adminEmail("nguyenvana@techcorp.vn")
                .amountVnd(new java.math.BigDecimal("36000000"))
                .currency("VND")
                .status("PENDING")
                .canPay(true)
                .build();

        when(billingService.lookupOrders("nguyenvana@techcorp.vn")).thenReturn(List.of(order));

        mockMvc.perform(get("/api/v1/public/checkout/orders")
                        .param("email", "nguyenvana@techcorp.vn"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].invoiceNumber").value("INV-202609-0001"))
                .andExpect(jsonPath("$.data[0].canPay").value(true));
    }

    @Test
    void getCheckoutOrder_ReturnsFullDetails() throws Exception {
        CheckoutResponse order = CheckoutResponse.builder()
                .invoiceId(101L)
                .invoiceNumber("INV-202609-0001")
                .planName("Gói Chuyên Nghiệp")
                .planCode("PROFESSIONAL")
                .subdomain("techcorp")
                .amountVnd(new java.math.BigDecimal("36000000"))
                .status("PENDING")
                .transferSyntax("SH INV-202609-0001")
                .build();

        when(billingService.getCheckoutOrder(101L)).thenReturn(order);

        mockMvc.perform(get("/api/v1/public/checkout/order/101"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.invoiceNumber").value("INV-202609-0001"));
    }
}
