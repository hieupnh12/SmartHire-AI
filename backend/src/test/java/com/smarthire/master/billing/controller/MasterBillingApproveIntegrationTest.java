package com.smarthire.master.billing.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "spring.rabbitmq.listener.simple.auto-startup=false",
        "management.health.redis.enabled=false",
        "management.health.rabbit.enabled=false"
})
public class MasterBillingApproveIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void testGetPublicPlans() throws Exception {
        mockMvc.perform(get("/api/v1/public/checkout/plans"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray());
    }

    @Test
    @WithMockUser(roles = "WORKSPACE_ADMIN")
    public void testCheckoutAndApproveInvoice() throws Exception {
        String uniqueSubdomain = "sub" + (System.currentTimeMillis() % 10000000);
        String payload = String.format("""
        {
          "planCode": "STARTER",
          "billingCycle": "MONTHLY",
          "workspaceName": "SmartHire Test",
          "subdomain": "%s",
          "adminFullName": "Test Admin",
          "adminEmail": "%s@test.com",
          "adminPhone": "0987654321",
          "companyLegalName": "Công ty Test",
          "taxCode": "0109998888",
          "billingAddress": "123 Đường Cầu Giấy, Hà Nội"
        }
        """, uniqueSubdomain, uniqueSubdomain);

        // 1. Submit checkout via public endpoint -> returns 201 CREATED
        MvcResult result = mockMvc.perform(post("/api/v1/public/checkout")
               .contentType(MediaType.APPLICATION_JSON)
               .content(payload))
               .andExpect(status().isCreated())
               .andExpect(jsonPath("$.success").value(true))
               .andExpect(jsonPath("$.data.invoiceNumber").isNotEmpty())
               .andExpect(jsonPath("$.data.qrUrl").isNotEmpty())
               .andReturn();

        String responseStr = result.getResponse().getContentAsString();
        Integer invoiceId = com.jayway.jsonpath.JsonPath.read(responseStr, "$.data.invoiceId");

        // 2. Approve invoice as WORKSPACE_ADMIN -> returns 200 OK
        mockMvc.perform(post("/api/v1/master/invoices/" + invoiceId + "/approve"))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$.success").value(true))
               .andExpect(jsonPath("$.data.status").value("PAID"));
    }
}
