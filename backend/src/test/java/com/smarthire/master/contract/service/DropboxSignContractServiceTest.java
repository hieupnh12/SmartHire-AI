package com.smarthire.master.contract.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.common.exception.BusinessException;
import com.fasterxml.jackson.databind.JsonNode;
import com.smarthire.domain.master.entity.ConsultationRequest;
import com.smarthire.domain.master.entity.Contract;
import com.smarthire.domain.master.entity.ContractSignature;
import com.smarthire.domain.master.entity.TenantInfo;
import com.smarthire.domain.master.entity.TenantSubscription;
import com.smarthire.domain.master.repository.*;
import com.smarthire.master.billing.service.MasterBillingService;
import com.smarthire.master.notification.messaging.MasterNotificationPublisher;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DropboxSignContractServiceTest {

    @Mock
    private ContractRepository contractRepository;
    @Mock
    private ContractSignatureRepository signatureRepository;
    @Mock
    private TenantInfoRepository tenantInfoRepository;
    @Mock
    private SubscriptionPlanRepository planRepository;
    @Mock
    private TenantSubscriptionRepository subscriptionRepository;
    @Mock
    private ConsultationRequestRepository consultationRequestRepository;
    @Mock
    private TenantSystemLogRepository auditLogRepository;
    @Mock
    private MasterBillingService masterBillingService;
    @Mock
    private MasterNotificationPublisher notificationPublisher;

    private ContractPdfGeneratorService pdfGeneratorService;
    private DropboxSignClient dropboxSignClient;
    private MasterContractService masterContractService;

    private static final String TEST_API_KEY = "test_dropbox_sign_api_key_secret_123";

    @BeforeEach
    void setUp() {
        ObjectMapper objectMapper = new ObjectMapper();
        pdfGeneratorService = new ContractPdfGeneratorService();
        dropboxSignClient = spy(new DropboxSignClient(TEST_API_KEY, "https://api.hellosign.com/v3", true, objectMapper));

        masterContractService = new MasterContractService(
                contractRepository,
                signatureRepository,
                tenantInfoRepository,
                planRepository,
                subscriptionRepository,
                consultationRequestRepository,
                auditLogRepository,
                masterBillingService,
                notificationPublisher,
                pdfGeneratorService,
                dropboxSignClient,
                objectMapper
        );
    }

    @Test
    void generateContractPdf_producesValidPdfAndSha256Checksum() {
        Contract contract = Contract.builder()
                .id(10L)
                .contractNumber("CTR-202610-0010")
                .title("Hợp đồng cung cấp dịch vụ nền tảng SmartHire-AI")
                .contractValue(new BigDecimal("50000000"))
                .totalAmount(new BigDecimal("50000000"))
                .currency("VND")
                .startDate(LocalDate.of(2026, 10, 1))
                .endDate(LocalDate.of(2027, 10, 1))
                .partyAName("CÔNG TY CỔ PHẦN CÔNG NGHỆ SMARTHIRE VIỆT NAM")
                .partyATaxCode("0110888999")
                .partyBName("CÔNG TY TNHH FPT SOFTWARE")
                .partyBTaxCode("0101248141")
                .partyBRepresentative("Nguyễn Văn B")
                .partyBPosition("Giám Đốc")
                .partyBEmail("ceo@fpt.com")
                .createdAt(LocalDateTime.now())
                .build();

        byte[] pdfBytes = pdfGeneratorService.generateContractPdf(contract, "Enterprise Dedicated", "fpt_software");
        assertThat(pdfBytes).isNotEmpty();
        String header = new String(pdfBytes, 0, 4, StandardCharsets.US_ASCII);
        assertThat(header).isEqualTo("%PDF");

        String sha256 = pdfGeneratorService.computeSha256Hex(pdfBytes);
        assertThat(sha256).hasSize(64).matches("^[0-9a-f]{64}$");
    }

    @Test
    void verifyWebhookEventHash_validatesHmacSha256Correctly() throws Exception {
        String eventTime = "1728500000";
        String eventType = "signature_request_all_signed";

        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(TEST_API_KEY.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        byte[] digest = mac.doFinal((eventTime + eventType).getBytes(StandardCharsets.UTF_8));
        String validHash = HexFormat.of().formatHex(digest);

        assertThat(dropboxSignClient.verifyWebhookEventHash(eventTime, eventType, validHash)).isTrue();
        assertThat(dropboxSignClient.verifyWebhookEventHash(eventTime, eventType, "deadbeef")).isFalse();
    }

    @Test
    void handleDropboxSignWebhook_whenAllSigned_marksContractSignedAndStoresAuditTrailPdf() throws Exception {
        String eventTime = "1728500123";
        String eventType = "signature_request_all_signed";

        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(TEST_API_KEY.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        String eventHash = HexFormat.of().formatHex(
                mac.doFinal((eventTime + eventType).getBytes(StandardCharsets.UTF_8))
        );

        Contract contract = Contract.builder()
                .id(25L)
                .contractNumber("CTR-202610-0025")
                .tenantId(5L)
                .planId(2L)
                .title("Hợp đồng B2B Enterprise")
                .contractValue(new BigDecimal("100000000"))
                .totalAmount(new BigDecimal("100000000"))
                .currency("VND")
                .status("PENDING_SIGNATURE")
                .externalSignatureRequestId("req_abc_999")
                .partyBEmail("director@client.vn")
                .partyBName("Công ty Cổ phần Client VN")
                .build();

        ContractSignature sig = ContractSignature.builder()
                .id(100L)
                .contractId(25L)
                .signerName("Trần Thị B")
                .signerEmail("director@client.vn")
                .signerTitle("Tổng Giám Đốc")
                .status("PENDING")
                .externalSignatureId("sig_xyz_111")
                .build();

        byte[] mockSignedPdfWithAuditTrail = "%PDF-1.4 Dropbox Sign Signed PDF + Audit Trail".getBytes(StandardCharsets.UTF_8);

        when(contractRepository.findByExternalSignatureRequestId("req_abc_999")).thenReturn(Optional.of(contract));
        when(signatureRepository.findByContractIdAndStatus(25L, "PENDING")).thenReturn(Optional.of(sig));
        doReturn(mockSignedPdfWithAuditTrail).when(dropboxSignClient).downloadSignedPdf("req_abc_999");
        when(contractRepository.save(any(Contract.class))).thenAnswer(inv -> inv.getArgument(0));

        String webhookJson = """
                {
                  "event": {
                    "event_type": "signature_request_all_signed",
                    "event_time": "%s",
                    "event_hash": "%s"
                  },
                  "signature_request": {
                    "signature_request_id": "req_abc_999",
                    "is_complete": true,
                    "is_declined": false,
                    "details_url": "https://app.hellosign.com/manage/req_abc_999",
                    "signatures": [
                      {
                        "signature_id": "sig_xyz_111",
                        "signer_email_address": "director@client.vn",
                        "signer_name": "Trần Thị B",
                        "status_code": "signed",
                        "signed_at": 1728500100
                      }
                    ]
                  }
                }
                """.formatted(eventTime, eventHash);

        String response = masterContractService.handleDropboxSignWebhook(webhookJson, "203.0.113.10");

        assertThat(response).isEqualTo("Hello API Event Received");
        assertThat(contract.getStatus()).isEqualTo("SIGNED");
        assertThat(contract.getSignMethod()).isEqualTo("DROPBOX_SIGN");
        assertThat(contract.getSignedPdfBytes()).isEqualTo(mockSignedPdfWithAuditTrail);
        assertThat(contract.getDocumentChecksum()).isEqualTo(pdfGeneratorService.computeSha256Hex(mockSignedPdfWithAuditTrail));
        assertThat(sig.getStatus()).isEqualTo("SIGNED");
        assertThat(sig.getClientIp()).isEqualTo("203.0.113.10");
    }

    @Test
    void handleDropboxSignWebhook_whenDeclined_marksRejectedCancelsSubAndReleasesTenantSubdomain() throws Exception {
        String eventTime = "1728500456";
        String eventType = "signature_request_declined";

        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(TEST_API_KEY.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        String eventHash = HexFormat.of().formatHex(
                mac.doFinal((eventTime + eventType).getBytes(StandardCharsets.UTF_8))
        );

        Contract contract = Contract.builder()
                .id(41L)
                .contractNumber("CTR-202611-0041")
                .tenantId(10L)
                .planId(2L)
                .consultationRequestId(77L)
                .title("Hợp đồng B2B Enterprise")
                .contractValue(new BigDecimal("100000000"))
                .totalAmount(new BigDecimal("100000000"))
                .currency("VND")
                .status("PENDING_SIGNATURE")
                .externalSignatureRequestId("req_dec_001")
                .partyBEmail("ceo@acme.vn")
                .partyBName("Công ty CP Acme")
                .build();

        ContractSignature sig = ContractSignature.builder()
                .id(101L)
                .contractId(41L)
                .signerName("Nguyễn Văn A")
                .signerEmail("ceo@acme.vn")
                .signerTitle("Giám Đốc")
                .status("PENDING")
                .externalSignatureId("sig_dec_001")
                .build();

        TenantSubscription pendingSub = TenantSubscription.builder()
                .id(201L)
                .tenantId(10L)
                .planId(2L)
                .status("PENDING")
                .build();

        TenantInfo pendingTenant = TenantInfo.builder()
                .id(10L)
                .code("acme")
                .name("Công ty CP Acme")
                .subdomain("acme")
                .dbName("smarthire_tenant_acme")
                .status("PENDING_PAYMENT")
                .deleted(false)
                .build();

        ConsultationRequest lead = ConsultationRequest.builder()
                .id(77L)
                .companyName("Công ty CP Acme")
                .status("PROVISIONED")
                .build();

        when(contractRepository.findByExternalSignatureRequestId("req_dec_001")).thenReturn(Optional.of(contract));
        when(signatureRepository.findByContractIdAndStatus(41L, "PENDING")).thenReturn(Optional.of(sig));
        when(subscriptionRepository.findFirstByTenantIdAndStatusOrderByCreatedAtDesc(10L, "PENDING"))
                .thenReturn(Optional.of(pendingSub));
        when(tenantInfoRepository.findById(10L)).thenReturn(Optional.of(pendingTenant));
        when(consultationRequestRepository.findById(77L)).thenReturn(Optional.of(lead));
        when(contractRepository.save(any(Contract.class))).thenAnswer(inv -> inv.getArgument(0));

        String webhookJson = """
                {
                  "event": {
                    "event_type": "signature_request_declined",
                    "event_time": "%s",
                    "event_hash": "%s"
                  },
                  "signature_request": {
                    "signature_request_id": "req_dec_001",
                    "is_complete": false,
                    "is_declined": true,
                    "is_canceled": false,
                    "signatures": [
                      {
                        "signature_id": "sig_dec_001",
                        "signer_email_address": "ceo@acme.vn",
                        "signer_name": "Nguyễn Văn A",
                        "status_code": "declined"
                      }
                    ]
                  }
                }
                """.formatted(eventTime, eventHash);

        String response = masterContractService.handleDropboxSignWebhook(webhookJson, "203.0.113.20");

        assertThat(response).isEqualTo("Hello API Event Received");
        assertThat(contract.getStatus()).isEqualTo("REJECTED");
        assertThat(sig.getStatus()).isEqualTo("REJECTED");
        assertThat(pendingSub.getStatus()).isEqualTo("CANCELED");
        assertThat(pendingSub.getCancelReason()).isEqualTo("CONTRACT_DECLINED_CTR-202611-0041");
        assertThat(pendingTenant.getStatus()).isEqualTo("CANCELLED");
        assertThat(pendingTenant.isDeleted()).isTrue();
        assertThat(pendingTenant.getDeletedAt()).isNotNull();
        assertThat(pendingTenant.getSubdomain()).isEqualTo("released_10_acme");
        assertThat(pendingTenant.getCode()).isEqualTo("released_10_acme");
        assertThat(pendingTenant.getDbName()).isEqualTo("smarthire_tenant_released_10_acme");
        assertThat(lead.getStatus()).isEqualTo("REJECTED");
        verify(tenantInfoRepository).save(pendingTenant);
    }

    @Test
    void handleDropboxSignWebhook_whenDeclinedForActiveTenant_doesNotArchiveOrReleaseTenant() throws Exception {
        String eventTime = "1728500457";
        String eventType = "signature_request_declined";

        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(TEST_API_KEY.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        String eventHash = HexFormat.of().formatHex(
                mac.doFinal((eventTime + eventType).getBytes(StandardCharsets.UTF_8))
        );

        Contract contract = Contract.builder()
                .id(42L)
                .contractNumber("CTR-202611-0042")
                .tenantId(11L)
                .planId(2L)
                .title("Hợp đồng gia hạn Enterprise")
                .contractValue(new BigDecimal("100000000"))
                .totalAmount(new BigDecimal("100000000"))
                .currency("VND")
                .status("PENDING_SIGNATURE")
                .externalSignatureRequestId("req_dec_active_002")
                .build();

        TenantInfo activeTenant = TenantInfo.builder()
                .id(11L)
                .code("globex")
                .name("Globex Corp")
                .subdomain("globex")
                .dbName("smarthire_tenant_globex")
                .status("ACTIVE")
                .deleted(false)
                .build();

        when(contractRepository.findByExternalSignatureRequestId("req_dec_active_002")).thenReturn(Optional.of(contract));
        when(signatureRepository.findByContractIdAndStatus(42L, "PENDING")).thenReturn(Optional.empty());
        when(subscriptionRepository.findFirstByTenantIdAndStatusOrderByCreatedAtDesc(11L, "PENDING"))
                .thenReturn(Optional.empty());
        when(tenantInfoRepository.findById(11L)).thenReturn(Optional.of(activeTenant));
        when(contractRepository.save(any(Contract.class))).thenAnswer(inv -> inv.getArgument(0));

        String webhookJson = """
                {
                  "event": {
                    "event_type": "signature_request_declined",
                    "event_time": "%s",
                    "event_hash": "%s"
                  },
                  "signature_request": {
                    "signature_request_id": "req_dec_active_002",
                    "is_complete": false,
                    "is_declined": true,
                    "is_canceled": false
                  }
                }
                """.formatted(eventTime, eventHash);

        masterContractService.handleDropboxSignWebhook(webhookJson, "203.0.113.21");

        assertThat(contract.getStatus()).isEqualTo("REJECTED");
        assertThat(activeTenant.getStatus()).isEqualTo("ACTIVE");
        assertThat(activeTenant.isDeleted()).isFalse();
        assertThat(activeTenant.getSubdomain()).isEqualTo("globex");
        assertThat(activeTenant.getCode()).isEqualTo("globex");
        assertThat(activeTenant.getDbName()).isEqualTo("smarthire_tenant_globex");
        verify(tenantInfoRepository, never()).save(any(TenantInfo.class));
    }

    @Test
    void syncDropboxSignStatus_whenCanceledOnDropboxSign_marksTerminatedAndReleasesPendingTenant() throws Exception {
        Contract contract = Contract.builder()
                .id(43L)
                .contractNumber("CTR-202611-0043")
                .tenantId(12L)
                .planId(2L)
                .consultationRequestId(78L)
                .title("Hợp đồng B2B Tùy chỉnh")
                .contractValue(new BigDecimal("80000000"))
                .totalAmount(new BigDecimal("80000000"))
                .currency("VND")
                .status("PENDING_SIGNATURE")
                .externalSignatureRequestId("req_can_003")
                .build();

        TenantSubscription pendingSub = TenantSubscription.builder()
                .id(202L)
                .tenantId(12L)
                .planId(2L)
                .status("PENDING")
                .build();

        TenantInfo pendingTenant = TenantInfo.builder()
                .id(12L)
                .code("beta")
                .name("Beta JSC")
                .subdomain("beta")
                .dbName("smarthire_tenant_beta")
                .status("PENDING_PAYMENT")
                .deleted(false)
                .build();

        ConsultationRequest lead = ConsultationRequest.builder()
                .id(78L)
                .companyName("Beta JSC")
                .status("PROVISIONED")
                .build();

        JsonNode sigReqNode = new ObjectMapper().readTree("""
                {
                  "signature_request_id": "req_can_003",
                  "is_complete": false,
                  "is_declined": false,
                  "is_canceled": true,
                  "signatures": [
                    {
                      "signature_id": "sig_can_003",
                      "signer_email_address": "admin@beta.vn",
                      "signer_name": "Lê Thị C",
                      "status_code": "awaiting_signature"
                    }
                  ]
                }
                """);
        DropboxSignClient.DropboxSignStatusResult parsedStatus = dropboxSignClient.parseSignatureRequestStatusNode(sigReqNode);
        assertThat(parsedStatus.isCanceled()).isTrue();

        when(contractRepository.findById(43L)).thenReturn(Optional.of(contract));
        doReturn(parsedStatus).when(dropboxSignClient).getSignatureRequestStatus("req_can_003");
        when(signatureRepository.findByContractIdAndStatus(43L, "PENDING")).thenReturn(Optional.empty());
        when(subscriptionRepository.findFirstByTenantIdAndStatusOrderByCreatedAtDesc(12L, "PENDING"))
                .thenReturn(Optional.of(pendingSub));
        when(tenantInfoRepository.findById(12L)).thenReturn(Optional.of(pendingTenant));
        when(consultationRequestRepository.findById(78L)).thenReturn(Optional.of(lead));
        when(contractRepository.save(any(Contract.class))).thenAnswer(inv -> inv.getArgument(0));

        var result = masterContractService.syncDropboxSignStatus(43L, "127.0.0.1");

        assertThat(result.getStatus()).isEqualTo("TERMINATED");
        assertThat(pendingSub.getStatus()).isEqualTo("CANCELED");
        assertThat(pendingSub.getCancelReason()).isEqualTo("CONTRACT_CANCELED_CTR-202611-0043");
        assertThat(pendingTenant.getStatus()).isEqualTo("CANCELLED");
        assertThat(pendingTenant.isDeleted()).isTrue();
        assertThat(pendingTenant.getSubdomain()).isEqualTo("released_12_beta");
        assertThat(pendingTenant.getCode()).isEqualTo("released_12_beta");
        assertThat(pendingTenant.getDbName()).isEqualTo("smarthire_tenant_released_12_beta");
        assertThat(lead.getStatus()).isEqualTo("CONTACTED");
    }

    @Test
    void sendContract_whenRejectedOrTerminated_throwsBusinessException() {
        Contract rejected = Contract.builder()
                .id(44L)
                .contractNumber("CTR-202611-0044")
                .status("REJECTED")
                .partyBEmail("test@acme.vn")
                .build();

        when(contractRepository.findById(44L)).thenReturn(Optional.of(rejected));

        assertThatThrownBy(() -> masterContractService.sendContract(44L))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("từ chối hoặc chấm dứt");
    }

    @Test
    void syncDropboxSignStatus_whenMissingExternalRequestId_throwsBusinessException() {
        Contract contract = Contract.builder()
                .id(30L)
                .contractNumber("CTR-202610-0030")
                .status("DRAFT")
                .build();

        when(contractRepository.findById(30L)).thenReturn(Optional.of(contract));

        assertThatThrownBy(() -> masterContractService.syncDropboxSignStatus(30L, "127.0.0.1"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Dropbox Sign");
    }

    @Test
    void createContract_setsTotalAmountEqualToContractValueWithoutTax() {
        var req = com.smarthire.master.contract.dto.CreateContractRequest.builder()
                .title("Hợp đồng B2B không tính thuế VAT")
                .contractValue(new BigDecimal("36000000"))
                .currency("VND")
                .startDate(LocalDate.of(2026, 11, 1))
                .endDate(LocalDate.of(2027, 11, 1))
                .partyBName("Công ty TNHH Alpha")
                .partyBTaxCode("0101234567")
                .partyBEmail("alpha@example.com")
                .build();

        when(contractRepository.findByContractNumber(any())).thenReturn(Optional.empty());
        when(contractRepository.save(any(Contract.class))).thenAnswer(inv -> {
            Contract saved = inv.getArgument(0);
            saved.setId(55L);
            return saved;
        });

        var res = masterContractService.createContract(req);

        assertThat(res.getContractValue()).isEqualByComparingTo("36000000");
        assertThat(res.getTotalAmount()).isEqualByComparingTo("36000000");
        assertThat(res.getAmountInWords()).contains("Đồng").doesNotContain("thuế").doesNotContain("GTGT").doesNotContain("VAT");
    }

    @Test
    @org.junit.jupiter.api.Disabled("Verified live against Dropbox Sign Sandbox (Request ID: b4c40194d340c1e4ad2bede42aa27d7735112928); disabled by default to avoid sending real emails on every test run")
    void liveSandbox_sendAndQuerySignatureRequest_whenApiKeyPresentInEnv() throws Exception {
        java.nio.file.Path envPath = java.nio.file.Path.of(".env");
        if (!java.nio.file.Files.exists(envPath)) {
            return;
        }
        String liveKey = java.nio.file.Files.readAllLines(envPath).stream()
                .filter(line -> line.startsWith("DROPBOX_SIGN_API_KEY="))
                .map(line -> line.substring("DROPBOX_SIGN_API_KEY=".length()).trim())
                .findFirst()
                .orElse("");
        if (liveKey.isEmpty()) {
            return;
        }

        DropboxSignClient liveClient = new DropboxSignClient(
                liveKey,
                "https://api.hellosign.com/v3",
                true,
                new ObjectMapper()
        );

        Contract contract = Contract.builder()
                .id(999L)
                .contractNumber("CTR-SANDBOX-202610")
                .title("Hợp đồng cung cấp dịch vụ nền tảng tuyển dụng SmartHire-AI")
                .contractValue(new BigDecimal("120000000"))
                .totalAmount(new BigDecimal("120000000"))
                .amountInWords("Một trăm hai mươi triệu đồng chẵn")
                .currency("VND")
                .startDate(LocalDate.of(2026, 10, 9))
                .endDate(LocalDate.of(2027, 10, 9))
                .partyAName("CÔNG TY CỔ PHẦN CÔNG NGHỆ SMARTHIRE VIỆT NAM")
                .partyATaxCode("0110888999")
                .partyARepresentative("Nguyễn Minh Hiếu")
                .partyAPosition("Tổng Giám Đốc")
                .partyBName("CÔNG TY CỔ PHẦN DOANH NGHIỆP ĐỐI TÁC")
                .partyBTaxCode("0109988776")
                .partyBRepresentative("Nguyễn Nhật Sinh")
                .partyBPosition("Giám Đốc Điều Hành")
                .partyBEmail("de180169nguyennhatsinh@gmail.com")
                .createdAt(LocalDateTime.now())
                .build();

        byte[] pdfBytes = pdfGeneratorService.generateContractPdf(contract, "Enterprise Dedicated", "partner_corp");
        String draftSha256 = pdfGeneratorService.computeSha256Hex(pdfBytes);

        DropboxSignClient.DropboxSignSendResult sendResult = liveClient.sendSignatureRequest(contract, pdfBytes);
        assertThat(sendResult.getSignatureRequestId()).isNotBlank();
        assertThat(sendResult.getSignatureId()).isNotBlank();
        assertThat(sendResult.isTestMode()).isTrue();

        DropboxSignClient.DropboxSignStatusResult statusResult =
                liveClient.getSignatureRequestStatus(sendResult.getSignatureRequestId());
        assertThat(statusResult.getSignatureRequestId()).isEqualTo(sendResult.getSignatureRequestId());
        assertThat(statusResult.getSignerEmail()).isEqualTo("de180169nguyennhatsinh@gmail.com");
        assertThat(statusResult.getSignerStatusCode()).isEqualTo("awaiting_signature");

        System.out.println("=== DROPBOX SIGN SANDBOX VERIFICATION ===");
        System.out.println("Signature Request ID : " + sendResult.getSignatureRequestId());
        System.out.println("Signature ID         : " + sendResult.getSignatureId());
        System.out.println("Details URL          : " + sendResult.getDetailsUrl());
        System.out.println("Draft PDF SHA-256    : " + draftSha256);
        System.out.println("Signer Status        : " + statusResult.getSignerStatusCode());
    }
}

