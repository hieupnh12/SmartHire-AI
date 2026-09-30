package com.smarthire.master.billing.service;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.master.entity.*;
import com.smarthire.domain.master.repository.*;
import com.smarthire.master.billing.dto.CheckoutRequest;
import com.smarthire.master.billing.dto.CheckoutResponse;
import com.smarthire.master.billing.dto.InvoiceResponse;
import com.smarthire.master.tenant.service.MasterTenantService;
import com.smarthire.tenant.auth.service.InviteMailSender;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MasterBillingServiceTest {

    @Mock
    private InvoiceRepository invoiceRepository;

    @Mock
    private InvoiceLineItemRepository invoiceLineItemRepository;

    @Mock
    private TenantInfoRepository tenantRepository;

    @Mock
    private SubscriptionPlanRepository planRepository;

    @Mock
    private TenantSubscriptionRepository subscriptionRepository;

    @Mock
    private MasterTenantService masterTenantService;

    @Mock
    private InviteMailSender mailSender;

    private MasterBillingService billingService;

    @BeforeEach
    void setUp() {
        billingService = new MasterBillingService(
                invoiceRepository,
                invoiceLineItemRepository,
                tenantRepository,
                planRepository,
                subscriptionRepository,
                masterTenantService,
                mailSender
        );
        ReflectionTestUtils.setField(billingService, "baseDomain", "smarthire.top");
    }

    @Test
    void checkout_Monthly_Success() {
        SubscriptionPlan plan = SubscriptionPlan.builder()
                .id(1L)
                .code("STARTER")
                .name("Gói Khởi Động")
                .priceMonthly(new BigDecimal("49"))
                .priceYearly(new BigDecimal("490"))
                .priceMonthlyVnd(new BigDecimal("1200000"))
                .priceYearlyVnd(new BigDecimal("12000000"))
                .status("ACTIVE")
                .build();

        TenantInfo tenant = new TenantInfo();
        tenant.setId(10L);
        tenant.setCode("acme");
        tenant.setName("Acme Corp");
        tenant.setSubdomain("acme");
        tenant.setContactName("Nguyen Van A");
        tenant.setContactEmail("admin@acme.com");
        tenant.setStatus("PENDING_PAYMENT");

        when(planRepository.findByCode("STARTER")).thenReturn(Optional.of(plan));
        when(masterTenantService.registerPendingTenant(
                eq("acme"), eq("Acme Corp"), eq("acme"),
                eq("Nguyen Van A"), eq("admin@acme.com"), eq("0987654321"),
                eq("0102030405"), eq("Cong Ty Acme"), eq("123 Ha Noi")
        )).thenReturn(tenant);

        TenantSubscription savedSub = TenantSubscription.builder().id(20L).tenantId(10L).planId(1L).status("PENDING").build();
        when(subscriptionRepository.save(any(TenantSubscription.class))).thenReturn(savedSub);

        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(invocation -> {
            Invoice inv = invocation.getArgument(0);
            inv.setId(30L);
            inv.setCreatedAt(LocalDateTime.now());
            return inv;
        });

        CheckoutRequest request = CheckoutRequest.builder()
                .planCode("STARTER")
                .billingCycle("MONTHLY")
                .workspaceName("Acme Corp")
                .subdomain("acme")
                .adminFullName("Nguyen Van A")
                .adminEmail("admin@acme.com")
                .adminPhone("0987654321")
                .taxCode("0102030405")
                .companyLegalName("Cong Ty Acme")
                .billingAddress("123 Ha Noi")
                .build();

        CheckoutResponse response = billingService.checkout(request);

        assertThat(response).isNotNull();
        assertThat(response.getInvoiceId()).isEqualTo(30L);
        assertThat(response.getAmountVnd()).isEqualByComparingTo("1200000");
        assertThat(response.getCurrency()).isEqualTo("VND");
        assertThat(response.getStatus()).isEqualTo("PENDING");
        assertThat(response.getBankName()).isEqualTo("Techcombank (TCB)");
        assertThat(response.getAccountNumber()).isEqualTo("190388889999");
        assertThat(response.getTransferSyntax()).startsWith("SH ");
        assertThat(response.getQrUrl()).contains("190388889999");
        assertThat(response.getQrUrl()).contains("1200000");

        verify(invoiceLineItemRepository).save(any(InvoiceLineItem.class));
    }

    @Test
    void checkout_Yearly_Success() {
        SubscriptionPlan plan = SubscriptionPlan.builder()
                .id(2L)
                .code("PROFESSIONAL")
                .name("Gói Chuyên Nghiệp")
                .priceMonthlyVnd(new BigDecimal("3600000"))
                .priceYearlyVnd(new BigDecimal("36000000"))
                .status("ACTIVE")
                .build();

        TenantInfo tenant = new TenantInfo();
        tenant.setId(11L);
        tenant.setCode("megacorp");
        tenant.setSubdomain("megacorp");
        tenant.setStatus("PENDING_PAYMENT");

        when(planRepository.findByCode("PROFESSIONAL")).thenReturn(Optional.of(plan));
        when(masterTenantService.registerPendingTenant(any(), any(), any(), any(), any(), any(), any(), any(), any())).thenReturn(tenant);
        when(subscriptionRepository.save(any(TenantSubscription.class))).thenReturn(TenantSubscription.builder().id(21L).build());
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(invocation -> {
            Invoice inv = invocation.getArgument(0);
            inv.setId(31L);
            inv.setCreatedAt(LocalDateTime.now());
            return inv;
        });

        CheckoutRequest request = CheckoutRequest.builder()
                .planCode("PROFESSIONAL")
                .billingCycle("YEARLY")
                .workspaceName("Mega Corp")
                .subdomain("megacorp")
                .adminFullName("Tran Van B")
                .adminEmail("b@megacorp.vn")
                .adminPhone("0912345678")
                .build();

        CheckoutResponse response = billingService.checkout(request);

        assertThat(response.getAmountVnd()).isEqualByComparingTo("36000000");
        assertThat(response.getBillingCycle()).isEqualTo("YEARLY");
    }

    @Test
    void checkout_PlanNotFound_ThrowsException() {
        when(planRepository.findByCode("UNKNOWN")).thenReturn(Optional.empty());

        CheckoutRequest request = CheckoutRequest.builder()
                .planCode("UNKNOWN")
                .billingCycle("MONTHLY")
                .workspaceName("Test")
                .subdomain("test")
                .adminFullName("Test")
                .adminEmail("test@test.com")
                .adminPhone("0123456789")
                .build();

        assertThatThrownBy(() -> billingService.checkout(request))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Gói cước không tồn tại");
    }

    @Test
    void approveInvoice_PendingInvoice_ProvisionsTenantAndSendsMail() {
        Invoice invoice = Invoice.builder()
                .id(50L)
                .invoiceNumber("INV-202609-0050")
                .tenantId(10L)
                .subscriptionId(20L)
                .amount(new BigDecimal("1200000"))
                .currency("VND")
                .status("PENDING")
                .build();

        TenantSubscription subscription = TenantSubscription.builder()
                .id(20L)
                .tenantId(10L)
                .planId(1L)
                .status("PENDING")
                .build();

        TenantInfo tenant = new TenantInfo();
        tenant.setId(10L);
        tenant.setCode("acme");
        tenant.setName("Acme Corp");
        tenant.setSubdomain("acme");
        tenant.setContactName("Nguyen Van A");
        tenant.setContactEmail("admin@acme.com");
        tenant.setStatus("PENDING_PAYMENT");

        when(invoiceRepository.findById(50L)).thenReturn(Optional.of(invoice));
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(i -> i.getArgument(0));
        when(subscriptionRepository.findById(20L)).thenReturn(Optional.of(subscription));
        when(tenantRepository.findById(10L)).thenReturn(Optional.of(tenant));
        when(masterTenantService.provisionPendingTenant(10L)).thenReturn("TempPassword123!");

        InvoiceResponse response = billingService.approveInvoice(50L);

        assertThat(response.getStatus()).isEqualTo("PAID");
        assertThat(invoice.getStatus()).isEqualTo("PAID");
        assertThat(invoice.getPaidAt()).isNotNull();
        assertThat(subscription.getStatus()).isEqualTo("ACTIVE");

        verify(masterTenantService).provisionPendingTenant(10L);
        verify(mailSender).send(eq("admin@acme.com"), contains("Kích hoạt"), contains("TempPassword123!"));
    }

    @Test
    void approveInvoice_AlreadyPaid_ThrowsException() {
        Invoice invoice = Invoice.builder()
                .id(51L)
                .status("PAID")
                .build();

        when(invoiceRepository.findById(51L)).thenReturn(Optional.of(invoice));

        assertThatThrownBy(() -> billingService.approveInvoice(51L))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Chỉ có thể duyệt hóa đơn ở trạng thái PENDING");
    }

    @Test
    void approveInvoice_NotFound_ThrowsException() {
        when(invoiceRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> billingService.approveInvoice(999L))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Hóa đơn không tồn tại");
    }
}
