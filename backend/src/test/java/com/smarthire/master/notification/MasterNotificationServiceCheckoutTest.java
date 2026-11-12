package com.smarthire.master.notification;

import com.smarthire.common.redis.RedisService;
import com.smarthire.domain.master.repository.TenantInfoRepository;
import com.smarthire.master.billing.dto.OrderPdfData;
import com.smarthire.master.notification.dto.MasterEmailPayload;
import com.smarthire.master.notification.messaging.MasterNotificationPublisher;
import com.smarthire.master.notification.service.MasterNotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MasterNotificationServiceCheckoutTest {

    @Mock
    private MasterNotificationPublisher publisher;

    @Mock
    private TenantInfoRepository tenantRepository;

    @Mock
    private RedisService redisService;

    private MasterNotificationService notificationService;

    @BeforeEach
    void setUp() {
        notificationService = new MasterNotificationService(publisher, tenantRepository, redisService);
    }

    @Test
    void sendCheckoutOrderCreated_IncludesInvoiceParamInCheckoutUrl() {
        ReflectionTestUtils.setField(notificationService, "publicOrigin", "https://smarthire.top/");
        when(redisService.setIfAbsent(eq("email_sent:checkout_order:INV-202611-0099"), eq("1"), any(Duration.class)))
                .thenReturn(true);

        OrderPdfData orderData = OrderPdfData.builder()
                .invoiceNumber("INV-202611-0099")
                .orderDate("12/11/2026")
                .customerName("Acme Corp")
                .planName("Professional")
                .quantity(2)
                .unitPrice(new BigDecimal("36000000"))
                .totalPrice(new BigDecimal("72000000"))
                .bankName("TPBank")
                .accountNumber("07744348801")
                .accountName("NGUYEN NHAT SINH")
                .transferSyntax("SH INV-202611-0099")
                .qrUrl("https://qr.sepay.vn/img")
                .build();

        notificationService.sendCheckoutOrderCreated(orderData, new byte[]{1, 2, 3}, "admin@acme.com");

        ArgumentCaptor<MasterEmailPayload> captor = ArgumentCaptor.forClass(MasterEmailPayload.class);
        verify(publisher).publishEmail(captor.capture());
        assertThat(captor.getValue().getTemplateVariables().get("checkoutUrl"))
                .isEqualTo("https://smarthire.top/checkout?invoice=INV-202611-0099");
    }
}
