package com.smarthire.master.billing.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.master.billing.dto.SePayWebhookResponse;
import com.smarthire.master.billing.service.SePayService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class SePayControllerTest {

    @Mock
    private SePayService sePayService;

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private static final String SECRET_KEY = "whsec_FCttq8liLKbcEqXeQ3i6Ddjwk6ZN9cCP";

    @BeforeEach
    void setUp() {
        SePayController controller = new SePayController(sePayService, objectMapper);
        ReflectionTestUtils.setField(controller, "webhookSecret", SECRET_KEY);
        ReflectionTestUtils.setField(controller, "requireSignature", true);

        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    private String calculateHmac(String data, String key) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        byte[] bytes = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
        StringBuilder sb = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }

    @Test
    void webhook_ValidSignature_ReturnsOk() throws Exception {
        String rawBody = "{\"id\":92704,\"gateway\":\"TPBank\",\"transferType\":\"in\",\"transferAmount\":12000000,\"content\":\"SH INV-202610-0001\"}";
        String signature = calculateHmac(rawBody, SECRET_KEY);

        when(sePayService.processWebhook(any())).thenReturn(SePayWebhookResponse.ok());

        mockMvc.perform(post("/api/v1/public/sepay/webhook")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-SePay-Signature", signature)
                        .content(rawBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    void webhook_ValidSignatureWithSha256PrefixAndTimestamp_ReturnsOk() throws Exception {
        String rawBody = "{\"id\":92704,\"gateway\":\"TPBank\",\"transferType\":\"in\",\"transferAmount\":12000000,\"content\":\"SH INV-202610-0001\"}";
        String timestamp = String.valueOf(System.currentTimeMillis() / 1000);
        String signature = calculateHmac(timestamp + "." + rawBody, SECRET_KEY);

        when(sePayService.processWebhook(any())).thenReturn(SePayWebhookResponse.ok());

        mockMvc.perform(post("/api/v1/public/sepay/webhook")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-SePay-Signature", "sha256=" + signature)
                        .header("X-SePay-Timestamp", timestamp)
                        .content(rawBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    void webhook_InvalidSignature_ReturnsUnauthorized() throws Exception {
        String rawBody = "{\"id\":92704,\"gateway\":\"TPBank\",\"transferType\":\"in\",\"transferAmount\":12000000,\"content\":\"SH INV-202610-0001\"}";

        mockMvc.perform(post("/api/v1/public/sepay/webhook")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-SePay-Signature", "invalid_signature_hex")
                        .content(rawBody))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void webhook_TestSimulationHeader_ReturnsOk() throws Exception {
        String rawBody = "{\"id\":92704,\"gateway\":\"TPBank\",\"transferType\":\"in\",\"transferAmount\":12000000,\"content\":\"SH INV-202610-0001\"}";

        when(sePayService.processWebhook(any())).thenReturn(SePayWebhookResponse.ok());

        mockMvc.perform(post("/api/v1/public/sepay/webhook")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-Test-Simulation", "true")
                        .content(rawBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }
}
