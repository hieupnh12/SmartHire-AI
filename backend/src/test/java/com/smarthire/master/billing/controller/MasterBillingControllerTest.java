package com.smarthire.master.billing.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.common.exception.BusinessException;
import com.smarthire.common.exception.GlobalExceptionHandler;
import com.smarthire.master.billing.dto.InvoiceResponse;
import com.smarthire.master.billing.service.MasterBillingService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class MasterBillingControllerTest {

    @Mock
    private MasterBillingService billingService;

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        MasterBillingController controller = new MasterBillingController(billingService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void approveInvoice_Success_ReturnsOk() throws Exception {
        InvoiceResponse response = InvoiceResponse.builder()
                .id(10L)
                .invoiceNumber("INV-202609-0002")
                .tenantId(5L)
                .tenantName("Công ty ABC")
                .tenantSubdomain("abc")
                .amount(new BigDecimal("3600000"))
                .currency("VND")
                .status("PAID")
                .paidAt(LocalDateTime.now())
                .paymentGateway("BANK_TRANSFER")
                .build();

        when(billingService.approveInvoice(eq(10L))).thenReturn(response);

        mockMvc.perform(post("/api/v1/master/invoices/10/approve"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(10))
                .andExpect(jsonPath("$.data.invoiceNumber").value("INV-202609-0002"))
                .andExpect(jsonPath("$.data.status").value("PAID"));
    }

    @Test
    void approveInvoice_NotPending_ReturnsBadRequest() throws Exception {
        when(billingService.approveInvoice(eq(10L)))
                .thenThrow(new BusinessException("Chỉ có thể duyệt hóa đơn ở trạng thái PENDING", HttpStatus.BAD_REQUEST, "INVALID_INVOICE_STATE"));

        mockMvc.perform(post("/api/v1/master/invoices/10/approve"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.code").value("INVALID_INVOICE_STATE"));
    }
}
