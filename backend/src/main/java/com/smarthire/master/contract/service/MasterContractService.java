package com.smarthire.master.contract.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.master.entity.Contract;
import com.smarthire.domain.master.entity.ContractSignature;
import com.smarthire.domain.master.entity.PlatformAuditLog;
import com.smarthire.domain.master.entity.SubscriptionPlan;
import com.smarthire.domain.master.entity.TenantInfo;
import com.smarthire.domain.master.repository.ContractRepository;
import com.smarthire.domain.master.repository.ContractSignatureRepository;
import com.smarthire.domain.master.repository.PlatformAuditLogRepository;
import com.smarthire.domain.master.repository.SubscriptionPlanRepository;
import com.smarthire.domain.master.repository.TenantInfoRepository;
import com.smarthire.master.billing.dto.CreateInvoiceRequest;
import com.smarthire.master.billing.service.MasterBillingService;
import com.smarthire.master.contract.dto.ContractResponse;
import com.smarthire.master.contract.dto.ContractSignatureResponse;
import com.smarthire.master.contract.dto.CreateContractRequest;
import com.smarthire.master.contract.dto.UpdateContractStatusRequest;
import com.smarthire.master.notification.dto.MasterEmailPayload;
import com.smarthire.master.notification.messaging.MasterNotificationPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ThreadLocalRandom;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class MasterContractService {

    private static final Set<String> VALID_STATUSES = Set.of("DRAFT", "PENDING_SIGNATURE", "SIGNED", "EXPIRED", "TERMINATED");

    private final ContractRepository contractRepository;
    private final ContractSignatureRepository signatureRepository;
    private final TenantInfoRepository tenantRepository;
    private final SubscriptionPlanRepository planRepository;
    private final PlatformAuditLogRepository auditLogRepository;
    private final MasterBillingService billingService;
    private final MasterNotificationPublisher notificationPublisher;
    private final ContractPdfGeneratorService contractPdfGeneratorService;
    private final DropboxSignClient dropboxSignClient;
    private final ObjectMapper objectMapper;

    @Value("${smarthire.invite.public-origin:http://localhost:5173}")
    private String publicOrigin;

    @Transactional(transactionManager = "masterTransactionManager", readOnly = true)
    public List<ContractResponse> getAllContracts(String statusFilter, Long tenantId) {
        List<Contract> contracts;
        if (tenantId != null) {
            contracts = contractRepository.findByTenantIdOrderByCreatedAtDesc(tenantId);
        } else if (StringUtils.hasText(statusFilter) && !"ALL".equalsIgnoreCase(statusFilter)) {
            contracts = contractRepository.findByStatusOrderByCreatedAtDesc(statusFilter.toUpperCase());
        } else {
            contracts = contractRepository.findAllByOrderByCreatedAtDesc();
        }

        Map<Long, TenantInfo> tenantMap = tenantRepository.findAll().stream()
                .collect(Collectors.toMap(TenantInfo::getId, Function.identity(), (a, b) -> a));
        Map<Long, SubscriptionPlan> planMap = planRepository.findAll().stream()
                .collect(Collectors.toMap(SubscriptionPlan::getId, Function.identity(), (a, b) -> a));

        return contracts.stream().map(c -> enrichContractResponse(c, tenantMap, planMap)).toList();
    }

    @Transactional(transactionManager = "masterTransactionManager", readOnly = true)
    public ContractResponse getContractById(Long id) {
        Contract contract = contractRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Hợp đồng không tồn tại", HttpStatus.NOT_FOUND, "CONTRACT_NOT_FOUND"));

        TenantInfo tenant = contract.getTenantId() != null ? tenantRepository.findById(contract.getTenantId()).orElse(null) : null;
        SubscriptionPlan plan = contract.getPlanId() != null ? planRepository.findById(contract.getPlanId()).orElse(null) : null;

        return enrichContractResponse(contract, tenant, plan);
    }

    @Transactional(transactionManager = "masterTransactionManager")
    public ContractResponse createContract(CreateContractRequest request) {
        TenantInfo tenant = null;
        if (request.getTenantId() != null) {
            tenant = tenantRepository.findById(request.getTenantId())
                    .orElseThrow(() -> new BusinessException("Doanh nghiệp không tồn tại", HttpStatus.NOT_FOUND, "TENANT_NOT_FOUND"));
        }

        SubscriptionPlan plan = null;
        if (request.getPlanId() != null) {
            plan = planRepository.findById(request.getPlanId())
                    .orElseThrow(() -> new BusinessException("Gói cước không tồn tại", HttpStatus.NOT_FOUND, "PLAN_NOT_FOUND"));
        }

        if (request.getEndDate().isBefore(request.getStartDate())) {
            throw new BusinessException("Ngày kết thúc hiệu lực phải sau ngày bắt đầu", HttpStatus.BAD_REQUEST, "INVALID_DATE_RANGE");
        }

        String contractNumber = generateContractNumber();
        String currency = StringUtils.hasText(request.getCurrency()) ? request.getCurrency().toUpperCase() : "USD";
        BigDecimal value = request.getContractValue() != null ? request.getContractValue() : BigDecimal.ZERO;
        BigDecimal taxRate = request.getTaxRate() != null ? request.getTaxRate() : BigDecimal.valueOf(10.00);
        BigDecimal taxAmount = value.multiply(taxRate).divide(BigDecimal.valueOf(100), 2, java.math.RoundingMode.HALF_UP);
        BigDecimal totalAmount = value.add(taxAmount);
        String amountInWords = convertMoneyToVietnameseWords(totalAmount, currency);

        String signingToken = java.util.UUID.randomUUID().toString().replace("-", "");

        Contract contract = Contract.builder()
                .contractNumber(contractNumber)
                .tenantId(tenant != null ? tenant.getId() : null)
                .planId(plan != null ? plan.getId() : null)
                .consultationRequestId(request.getConsultationRequestId())
                .title(request.getTitle().trim())
                .contractValue(value)
                .currency(currency)
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                // Party A
                .partyAName(StringUtils.hasText(request.getPartyAName()) ? request.getPartyAName().trim() : "CÔNG TY CỔ PHẦN CÔNG NGHỆ SMARTHIRE VIỆT NAM")
                .partyATaxCode(StringUtils.hasText(request.getPartyATaxCode()) ? request.getPartyATaxCode().trim() : "0110889988")
                .partyAAddress(StringUtils.hasText(request.getPartyAAddress()) ? request.getPartyAAddress().trim() : "Tòa nhà Keangnam Landmark 72, Đường Phạm Hùng, Phường Mễ Trì, Quận Nam Từ Liêm, TP. Hà Nội")
                .partyARepresentative(StringUtils.hasText(request.getPartyARepresentative()) ? request.getPartyARepresentative().trim() : "Phan Nhật Hưng")
                .partyAPosition(StringUtils.hasText(request.getPartyAPosition()) ? request.getPartyAPosition().trim() : "Tổng Giám Đốc")
                .partyAPhone(StringUtils.hasText(request.getPartyAPhone()) ? request.getPartyAPhone().trim() : "1900 6868")
                .partyAEmail(StringUtils.hasText(request.getPartyAEmail()) ? request.getPartyAEmail().trim() : "legal@smarthire.top")
                .partyABankName(StringUtils.hasText(request.getPartyABankName()) ? request.getPartyABankName().trim() : "Ngân hàng TMCP Kỹ Thương Việt Nam (Techcombank)")
                .partyABankAccount(StringUtils.hasText(request.getPartyABankAccount()) ? request.getPartyABankAccount().trim() : "190388889999")
                .partyABankBranch(StringUtils.hasText(request.getPartyABankBranch()) ? request.getPartyABankBranch().trim() : "Chi nhánh Hà Nội")
                // Party B
                .partyBName(StringUtils.hasText(request.getPartyBName()) ? request.getPartyBName().trim() : (tenant != null ? tenant.getName() : "Không xác định"))
                .partyBTaxCode(StringUtils.hasText(request.getPartyBTaxCode()) ? request.getPartyBTaxCode().trim() : null)
                .partyBAddress(StringUtils.hasText(request.getPartyBAddress()) ? request.getPartyBAddress().trim() : null)
                .partyBRepresentative(StringUtils.hasText(request.getPartyBRepresentative()) ? request.getPartyBRepresentative().trim() : null)
                .partyBPosition(StringUtils.hasText(request.getPartyBPosition()) ? request.getPartyBPosition().trim() : "Đại diện có thẩm quyền")
                .partyBPhone(StringUtils.hasText(request.getPartyBPhone()) ? request.getPartyBPhone().trim() : null)
                .partyBEmail(StringUtils.hasText(request.getPartyBEmail()) ? request.getPartyBEmail().trim().toLowerCase() : null)
                .partyBBankAccount(StringUtils.hasText(request.getPartyBBankAccount()) ? request.getPartyBBankAccount().trim() : null)
                // Tax & Totals
                .taxRate(taxRate)
                .taxAmount(taxAmount)
                .totalAmount(totalAmount)
                .amountInWords(amountInWords)
                .signingToken(signingToken)
                .tokenExpiresAt(LocalDateTime.now().plusDays(30))
                .status("DRAFT")
                .esignProvider("DROPBOX_SIGN")
                .esignTestMode(dropboxSignClient.isTestMode())
                .termsAndConditions(request.getTermsAndConditions())
                .notes(request.getNotes())
                .build();

        Contract saved = contractRepository.save(contract);
        log.info("Created Vietnam Legal B2B Contract: {} for tenant: {} ({})",
                saved.getContractNumber(),
                tenant != null ? tenant.getName() : "Draft",
                tenant != null ? tenant.getCode() : "N/A");

        return enrichContractResponse(saved, tenant, plan);
    }

    @Transactional(transactionManager = "masterTransactionManager")
    public ContractResponse updateContract(Long id, com.smarthire.master.contract.dto.UpdateContractRequest request) {
        Contract contract = contractRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Hợp đồng không tồn tại", HttpStatus.NOT_FOUND, "CONTRACT_NOT_FOUND"));

        if (!"DRAFT".equals(contract.getStatus())) {
            throw new BusinessException("Chỉ có thể cập nhật hợp đồng ở trạng thái DRAFT", HttpStatus.BAD_REQUEST, "CONTRACT_NOT_DRAFT");
        }

        if (request.getContractNumber() != null) contract.setContractNumber(request.getContractNumber());
        if (request.getTenantName() != null) contract.setPartyBName(request.getTenantName());
        if (request.getTenantTaxCode() != null) contract.setPartyBTaxCode(request.getTenantTaxCode());
        if (request.getTenantAddress() != null) contract.setPartyBAddress(request.getTenantAddress());
        if (request.getTenantRepresentative() != null) contract.setPartyBRepresentative(request.getTenantRepresentative());
        if (request.getTenantEmail() != null) contract.setPartyBEmail(request.getTenantEmail());
        if (request.getTenantPhone() != null) contract.setPartyBPhone(request.getTenantPhone());
        if (request.getTotalValue() != null) {
            contract.setContractValue(request.getTotalValue());
            BigDecimal taxRate = contract.getTaxRate() != null ? contract.getTaxRate() : BigDecimal.valueOf(10.00);
            BigDecimal taxAmount = request.getTotalValue().multiply(taxRate).divide(BigDecimal.valueOf(100), 2, java.math.RoundingMode.HALF_UP);
            BigDecimal totalAmount = request.getTotalValue().add(taxAmount);
            contract.setTaxAmount(taxAmount);
            contract.setTotalAmount(totalAmount);
            contract.setAmountInWords(convertMoneyToVietnameseWords(totalAmount, contract.getCurrency()));
        }
        if (request.getCurrency() != null) contract.setCurrency(request.getCurrency());
        if (request.getPaymentTerms() != null) contract.setTermsAndConditions(request.getPaymentTerms());
        if (request.getValidFrom() != null) contract.setStartDate(request.getValidFrom());
        if (request.getValidUntil() != null) contract.setEndDate(request.getValidUntil());

        Contract saved = contractRepository.save(contract);
        TenantInfo tenant = saved.getTenantId() != null ? tenantRepository.findById(saved.getTenantId()).orElse(null) : null;
        SubscriptionPlan plan = saved.getPlanId() != null ? planRepository.findById(saved.getPlanId()).orElse(null) : null;
        return enrichContractResponse(saved, tenant, plan);
    }

    /**
     * Generates the official B2B Contract PDF, computes its SHA-256 digest, and dispatches a
     * Remote Email Signature Request via Dropbox Sign API v3 (/v3/signature_request/send).
     */
    @Transactional(transactionManager = "masterTransactionManager")
    public ContractResponse sendContract(Long id) {
        Contract contract = contractRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Hợp đồng không tồn tại", HttpStatus.NOT_FOUND, "CONTRACT_NOT_FOUND"));

        if ("SIGNED".equals(contract.getStatus())) {
            throw new BusinessException("Hợp đồng này đã được ký kết hoàn tất.", HttpStatus.BAD_REQUEST, "CONTRACT_ALREADY_SIGNED");
        }

        if (!StringUtils.hasText(contract.getPartyBEmail())) {
            throw new BusinessException("Hợp đồng chưa có Email đại diện Bên B để gửi yêu cầu ký số qua Dropbox Sign.", HttpStatus.BAD_REQUEST, "MISSING_PARTY_B_EMAIL");
        }

        if (!StringUtils.hasText(contract.getSigningToken())) {
            contract.setSigningToken(java.util.UUID.randomUUID().toString().replace("-", ""));
        }

        TenantInfo tenant = contract.getTenantId() != null ? tenantRepository.findById(contract.getTenantId()).orElse(null) : null;
        SubscriptionPlan plan = contract.getPlanId() != null ? planRepository.findById(contract.getPlanId()).orElse(null) : null;

        byte[] contractPdfBytes = contractPdfGeneratorService.generateContractPdf(
                contract,
                plan != null ? plan.getName() : "Enterprise B2B",
                tenant != null ? tenant.getCode() : "enterprise");
        String draftChecksum = contractPdfGeneratorService.computeSha256Hex(contractPdfBytes);

        DropboxSignClient.DropboxSignSendResult sendResult = dropboxSignClient.sendSignatureRequest(contract, contractPdfBytes);

        contract.setEsignProvider("DROPBOX_SIGN");
        contract.setExternalSignatureRequestId(sendResult.getSignatureRequestId());
        contract.setEsignDetailsUrl(sendResult.getDetailsUrl());
        contract.setEsignTestMode(sendResult.isTestMode());
        contract.setDocumentChecksum(draftChecksum);
        contract.setSentAt(LocalDateTime.now());
        contract.setTokenExpiresAt(LocalDateTime.now().plusDays(14));
        contract.setStatus("PENDING_SIGNATURE");

        Contract saved = contractRepository.save(contract);

        ContractSignature signature = signatureRepository.findByContractIdAndStatus(saved.getId(), "PENDING")
                .orElseGet(() -> ContractSignature.builder()
                        .contractId(saved.getId())
                        .status("PENDING")
                        .build());
        signature.setSignerName(StringUtils.hasText(saved.getPartyBRepresentative()) ? saved.getPartyBRepresentative() : "Đại diện Bên B");
        signature.setSignerEmail(saved.getPartyBEmail());
        signature.setSignerTitle(StringUtils.hasText(saved.getPartyBPosition()) ? saved.getPartyBPosition() : "Đại diện có thẩm quyền");
        signature.setExternalSignatureId(sendResult.getSignatureId());
        signatureRepository.save(signature);

        log.info("Contract {} sent via Dropbox Sign [signature_request_id={}, test_mode={}] to {}",
                saved.getContractNumber(), sendResult.getSignatureRequestId(), sendResult.isTestMode(), saved.getPartyBEmail());

        try {
            auditLogRepository.save(PlatformAuditLog.builder()
                    .tenantCode(tenant != null ? tenant.getCode() : "MASTER")
                    .action("SEND_CONTRACT_DROPBOX_SIGN")
                    .level("INFO")
                    .description("Đã phát hành Hợp đồng B2B " + saved.getContractNumber()
                            + " qua Dropbox Sign API (signature_request_id=" + sendResult.getSignatureRequestId() + ") tới " + saved.getPartyBEmail())
                    .metadataJson(objectMapper.writeValueAsString(Map.of(
                            "contractId", saved.getId(),
                            "contractNumber", saved.getContractNumber(),
                            "signatureRequestId", sendResult.getSignatureRequestId() != null ? sendResult.getSignatureRequestId() : "",
                            "partyBEmail", saved.getPartyBEmail(),
                            "draftSha256", draftChecksum != null ? draftChecksum : "",
                            "testMode", sendResult.isTestMode()
                    )))
                    .build());
        } catch (Exception e) {
            log.warn("Could not write PlatformAuditLog for sendContract {}: {}", saved.getContractNumber(), e.getMessage());
        }

        // Send companion notification email with reference link
        try {
            String signUrl = publicOrigin + "/contracts/sign/" + saved.getSigningToken();
            MasterEmailPayload emailPayload = MasterEmailPayload.builder()
                    .tenantCode(tenant != null ? tenant.getCode() : "MASTER")
                    .toEmail(saved.getPartyBEmail())
                    .subject("Thông báo phát hành Hợp đồng B2B qua Dropbox Sign - " + saved.getContractNumber())
                    .templateName("contract-invitation")
                    .notificationType("CONTRACT_INVITATION")
                    .templateVariables(Map.of(
                            "contractNumber", saved.getContractNumber(),
                            "planName", plan != null ? plan.getName() : "Gói Tùy Biến B2B",
                            "contractValue", saved.getContractValue() != null ? saved.getContractValue() : 0,
                            "currency", saved.getCurrency() != null ? saved.getCurrency() : "VND",
                            "partyBName", saved.getPartyBName() != null ? saved.getPartyBName() : "Khách hàng",
                            "signUrl", signUrl
                    ))
                    .build();
            notificationPublisher.publishEmail(emailPayload);
        } catch (Exception e) {
            log.warn("Failed to publish companion email notification for contract {}: {}", saved.getContractNumber(), e.getMessage());
        }

        return enrichContractResponse(saved, tenant, plan);
    }

    @Transactional(transactionManager = "masterTransactionManager", readOnly = true)
    public ContractResponse getContractBySigningToken(String token) {
        Contract contract = contractRepository.findBySigningToken(token)
                .orElseThrow(() -> new BusinessException("Hợp đồng hoặc liên kết tra cứu không tồn tại hoặc đã hết hạn", HttpStatus.NOT_FOUND, "INVALID_SIGNING_TOKEN"));

        if (contract.getTokenExpiresAt() != null && LocalDateTime.now().isAfter(contract.getTokenExpiresAt()) && !"SIGNED".equals(contract.getStatus())) {
            throw new BusinessException("Liên kết hợp đồng này đã hết hạn. Vui lòng liên hệ SmartHire-AI để nhận yêu cầu ký mới.", HttpStatus.GONE, "SIGNING_TOKEN_EXPIRED");
        }

        TenantInfo tenant = contract.getTenantId() != null ? tenantRepository.findById(contract.getTenantId()).orElse(null) : null;
        SubscriptionPlan plan = contract.getPlanId() != null ? planRepository.findById(contract.getPlanId()).orElse(null) : null;
        return enrichContractResponse(contract, tenant, plan);
    }

    /**
     * Synchronizes the contract signing status directly from Dropbox Sign API v3.
     * If all signers have completed signing on Dropbox Sign, downloads the final signed PDF + Audit Trail,
     * computes the SHA-256 checksum, marks the contract as SIGNED, and auto-generates the B2B invoice.
     */
    @Transactional(transactionManager = "masterTransactionManager")
    public ContractResponse syncDropboxSignStatus(Long contractId, String clientIp) {
        Contract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> new BusinessException("Hợp đồng không tồn tại", HttpStatus.NOT_FOUND, "CONTRACT_NOT_FOUND"));
        return doSyncDropboxSignStatus(contract, clientIp);
    }

    @Transactional(transactionManager = "masterTransactionManager")
    public ContractResponse syncDropboxSignStatusByToken(String signingToken, String clientIp) {
        Contract contract = contractRepository.findBySigningToken(signingToken)
                .orElseThrow(() -> new BusinessException("Liên kết hợp đồng không hợp lệ", HttpStatus.NOT_FOUND, "INVALID_SIGNING_TOKEN"));
        return doSyncDropboxSignStatus(contract, clientIp);
    }

    private ContractResponse doSyncDropboxSignStatus(Contract contract, String clientIp) {
        if (!StringUtils.hasText(contract.getExternalSignatureRequestId())) {
            throw new BusinessException(
                    "Hợp đồng này chưa được gửi lên Dropbox Sign. Vui lòng bấm 'Gửi Hợp Đồng' trước khi đồng bộ trạng thái.",
                    HttpStatus.BAD_REQUEST,
                    "NO_EXTERNAL_SIGNATURE_REQUEST");
        }

        DropboxSignClient.DropboxSignStatusResult statusResult =
                dropboxSignClient.getSignatureRequestStatus(contract.getExternalSignatureRequestId());

        if (StringUtils.hasText(statusResult.getDetailsUrl())) {
            contract.setEsignDetailsUrl(statusResult.getDetailsUrl());
        }

        if (statusResult.isComplete() || "signed".equalsIgnoreCase(statusResult.getSignerStatusCode())) {
            if (!"SIGNED".equals(contract.getStatus()) || contract.getSignedPdfBytes() == null) {
                finalizeDropboxSignedContract(contract, statusResult, clientIp);
            }
        } else if (statusResult.isDeclined() || "declined".equalsIgnoreCase(statusResult.getSignerStatusCode())) {
            contract.setStatus("TERMINATED");
            contract.setNotes("Đối tác đã từ chối ký trên Dropbox Sign (signature_request_id=" + contract.getExternalSignatureRequestId() + ")");
            contractRepository.save(contract);
            signatureRepository.findByContractIdAndStatus(contract.getId(), "PENDING").ifPresent(sig -> {
                sig.setStatus("REJECTED");
                signatureRepository.save(sig);
            });
        }

        TenantInfo tenant = contract.getTenantId() != null ? tenantRepository.findById(contract.getTenantId()).orElse(null) : null;
        SubscriptionPlan plan = contract.getPlanId() != null ? planRepository.findById(contract.getPlanId()).orElse(null) : null;
        return enrichContractResponse(contract, tenant, plan);
    }

    /**
     * Handles incoming Dropbox Sign (HelloSign) Webhook callback events.
     * Always returns "Hello API Event Received" when HMAC-SHA256 verification succeeds.
     */
    @Transactional(transactionManager = "masterTransactionManager")
    public String handleDropboxSignWebhook(String payloadJson, String clientIp) {
        if (!StringUtils.hasText(payloadJson)) {
            throw new BusinessException("Empty Dropbox Sign webhook payload", HttpStatus.BAD_REQUEST, "EMPTY_WEBHOOK_PAYLOAD");
        }

        JsonNode root;
        try {
            root = objectMapper.readTree(payloadJson);
        } catch (Exception e) {
            throw new BusinessException("Malformed Dropbox Sign webhook JSON", HttpStatus.BAD_REQUEST, "INVALID_WEBHOOK_JSON");
        }

        JsonNode eventNode = root.path("event");
        String eventType = eventNode.path("event_type").asText("");
        String eventTime = eventNode.path("event_time").asText("");
        String eventHash = eventNode.path("event_hash").asText("");

        if (!dropboxSignClient.verifyWebhookEventHash(eventTime, eventType, eventHash)) {
            log.warn("Rejected Dropbox Sign webhook due to invalid HMAC-SHA256 event_hash (eventType={}, ip={})", eventType, clientIp);
            throw new BusinessException("Chữ ký HMAC-SHA256 của Webhook Dropbox Sign không hợp lệ", HttpStatus.UNAUTHORIZED, "INVALID_WEBHOOK_HMAC");
        }

        if ("callback_test".equalsIgnoreCase(eventType)) {
            log.info("Dropbox Sign webhook callback_test verified successfully");
            return "Hello API Event Received";
        }

        JsonNode sigReqNode = root.path("signature_request");
        if (sigReqNode.isMissingNode() || sigReqNode.isNull()) {
            return "Hello API Event Received";
        }

        DropboxSignClient.DropboxSignStatusResult statusResult = dropboxSignClient.parseSignatureRequestStatusNode(sigReqNode);
        String sigReqId = statusResult.getSignatureRequestId();

        Optional<Contract> contractOpt = StringUtils.hasText(sigReqId)
                ? contractRepository.findByExternalSignatureRequestId(sigReqId)
                : Optional.empty();

        if (contractOpt.isEmpty()) {
            String metaContractId = sigReqNode.path("metadata").path("contract_id").asText("");
            if (StringUtils.hasText(metaContractId) && metaContractId.matches("\\d+")) {
                contractOpt = contractRepository.findById(Long.parseLong(metaContractId));
            }
        }

        if (contractOpt.isPresent()) {
            Contract contract = contractOpt.get();
            if ("signature_request_all_signed".equalsIgnoreCase(eventType)
                    || "signature_request_signed".equalsIgnoreCase(eventType)
                    || statusResult.isComplete()) {
                if (!"SIGNED".equals(contract.getStatus()) || contract.getSignedPdfBytes() == null) {
                    finalizeDropboxSignedContract(contract, statusResult, clientIp);
                }
            } else if ("signature_request_declined".equalsIgnoreCase(eventType) || statusResult.isDeclined()) {
                contract.setStatus("TERMINATED");
                contractRepository.save(contract);
                signatureRepository.findByContractIdAndStatus(contract.getId(), "PENDING").ifPresent(sig -> {
                    sig.setStatus("REJECTED");
                    signatureRepository.save(sig);
                });
            }
        } else {
            log.warn("Received Dropbox Sign webhook {} for unknown signature_request_id={}", eventType, sigReqId);
        }

        return "Hello API Event Received";
    }

    private void finalizeDropboxSignedContract(
            Contract contract,
            DropboxSignClient.DropboxSignStatusResult statusResult,
            String sourceIp) {
        boolean wasAlreadySigned = "SIGNED".equals(contract.getStatus());

        byte[] signedPdfBytes = null;
        String finalChecksum = contract.getDocumentChecksum();
        try {
            signedPdfBytes = dropboxSignClient.downloadSignedPdf(contract.getExternalSignatureRequestId());
            finalChecksum = contractPdfGeneratorService.computeSha256Hex(signedPdfBytes);
        } catch (Exception e) {
            log.warn("Could not immediately download signed PDF for contract {} (signature_request_id={}): {}",
                    contract.getContractNumber(), contract.getExternalSignatureRequestId(), e.getMessage());
        }

        LocalDateTime signedAt = statusResult.getSignedAtEpochSeconds() != null && statusResult.getSignedAtEpochSeconds() > 0
                ? LocalDateTime.ofInstant(Instant.ofEpochSecond(statusResult.getSignedAtEpochSeconds()), ZoneOffset.UTC)
                : LocalDateTime.now();

        if (!StringUtils.hasText(contract.getSigningToken())) {
            contract.setSigningToken(java.util.UUID.randomUUID().toString().replace("-", ""));
        }

        contract.setStatus("SIGNED");
        contract.setSignMethod("DROPBOX_SIGN");
        contract.setEsignProvider("DROPBOX_SIGN");
        contract.setSignedAt(signedAt);
        if (StringUtils.hasText(sourceIp)) {
            contract.setClientIp(sourceIp);
        }
        if (signedPdfBytes != null && signedPdfBytes.length > 0) {
            contract.setSignedPdfBytes(signedPdfBytes);
            contract.setDocumentChecksum(finalChecksum);
            contract.setSignedDocumentUrl("/api/v1/public/contracts/" + contract.getSigningToken() + "/pdf");
        }
        if (StringUtils.hasText(statusResult.getSignerName())) {
            contract.setPartyBRepresentative(statusResult.getSignerName().trim());
        }
        Contract saved = contractRepository.save(contract);

        ContractSignature signature = signatureRepository.findByContractIdAndStatus(saved.getId(), "PENDING")
                .orElseGet(() -> {
                    List<ContractSignature> existing = signatureRepository.findByContractId(saved.getId());
                    return existing.isEmpty()
                            ? ContractSignature.builder()
                                    .contractId(saved.getId())
                                    .signerName(saved.getPartyBRepresentative() != null ? saved.getPartyBRepresentative() : "Đại diện Bên B")
                                    .signerEmail(saved.getPartyBEmail() != null ? saved.getPartyBEmail() : "")
                                    .signerTitle(saved.getPartyBPosition() != null ? saved.getPartyBPosition() : "Đại diện có thẩm quyền")
                                    .build()
                            : existing.get(0);
                });
        signature.setStatus("SIGNED");
        signature.setSignedAt(signedAt);
        if (StringUtils.hasText(statusResult.getSignatureId())) {
            signature.setExternalSignatureId(statusResult.getSignatureId());
        }
        if (StringUtils.hasText(statusResult.getSignerName())) {
            signature.setSignerName(statusResult.getSignerName().trim());
        }
        if (StringUtils.hasText(statusResult.getSignerEmail())) {
            signature.setSignerEmail(statusResult.getSignerEmail().trim());
        }
        if (StringUtils.hasText(sourceIp)) {
            signature.setClientIp(sourceIp);
        }
        signatureRepository.save(signature);

        TenantInfo tenant = saved.getTenantId() != null ? tenantRepository.findById(saved.getTenantId()).orElse(null) : null;
        try {
            auditLogRepository.save(PlatformAuditLog.builder()
                    .tenantCode(tenant != null ? tenant.getCode() : "MASTER")
                    .action("CONTRACT_SIGNED_DROPBOX_SIGN")
                    .level("INFO")
                    .ipAddress(sourceIp)
                    .description("Hợp đồng B2B " + saved.getContractNumber()
                            + " đã được ký số hoàn tất qua Dropbox Sign (SHA-256: " + (finalChecksum != null ? finalChecksum : "N/A") + ")")
                    .metadataJson(objectMapper.writeValueAsString(Map.of(
                            "contractId", saved.getId(),
                            "contractNumber", saved.getContractNumber(),
                            "signatureRequestId", saved.getExternalSignatureRequestId() != null ? saved.getExternalSignatureRequestId() : "",
                            "signatureId", signature.getExternalSignatureId() != null ? signature.getExternalSignatureId() : "",
                            "documentChecksumSha256", finalChecksum != null ? finalChecksum : "",
                            "signedAt", signedAt.toString()
                    )))
                    .build());
        } catch (Exception e) {
            log.warn("Could not write PlatformAuditLog for finalizeDropboxSignedContract {}: {}", saved.getContractNumber(), e.getMessage());
        }

        if (!wasAlreadySigned) {
            autoCreateInvoiceForSignedContract(saved);
        }
    }

    @Transactional(transactionManager = "masterTransactionManager")
    public byte[] getContractPdfBytesByToken(String token) {
        Contract contract = contractRepository.findBySigningToken(token)
                .orElseThrow(() -> new BusinessException("Hợp đồng không tồn tại", HttpStatus.NOT_FOUND, "INVALID_SIGNING_TOKEN"));
        return resolveContractPdfBytes(contract);
    }

    @Transactional(transactionManager = "masterTransactionManager")
    public byte[] getContractPdfBytesById(Long id) {
        Contract contract = contractRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Hợp đồng không tồn tại", HttpStatus.NOT_FOUND, "CONTRACT_NOT_FOUND"));
        return resolveContractPdfBytes(contract);
    }

    private byte[] resolveContractPdfBytes(Contract contract) {
        if (contract.getSignedPdfBytes() != null && contract.getSignedPdfBytes().length > 0) {
            return contract.getSignedPdfBytes();
        }
        if ("SIGNED".equals(contract.getStatus())
                && StringUtils.hasText(contract.getExternalSignatureRequestId())
                && dropboxSignClient.isConfigured()) {
            try {
                byte[] downloaded = dropboxSignClient.downloadSignedPdf(contract.getExternalSignatureRequestId());
                if (downloaded != null && downloaded.length > 0) {
                    contract.setSignedPdfBytes(downloaded);
                    contract.setDocumentChecksum(contractPdfGeneratorService.computeSha256Hex(downloaded));
                    contractRepository.save(contract);
                    return downloaded;
                }
            } catch (Exception e) {
                log.warn("Fallback to generated PDF for contract {}: {}", contract.getContractNumber(), e.getMessage());
            }
        }
        TenantInfo tenant = contract.getTenantId() != null ? tenantRepository.findById(contract.getTenantId()).orElse(null) : null;
        SubscriptionPlan plan = contract.getPlanId() != null ? planRepository.findById(contract.getPlanId()).orElse(null) : null;
        return contractPdfGeneratorService.generateContractPdf(
                contract,
                plan != null ? plan.getName() : "Enterprise B2B",
                tenant != null ? tenant.getCode() : "enterprise");
    }

    private void autoCreateInvoiceForSignedContract(Contract contract) {
        try {
            TenantInfo tenant = contract.getTenantId() != null ? tenantRepository.findById(contract.getTenantId()).orElse(null) : null;
            if (tenant != null) {
                CreateInvoiceRequest invoiceReq = CreateInvoiceRequest.builder()
                        .tenantId(tenant.getId())
                        .planId(contract.getPlanId())
                        .contractId(contract.getId())
                        .amount(contract.getTotalAmount() != null && contract.getTotalAmount().compareTo(BigDecimal.ZERO) > 0 ? contract.getTotalAmount() : contract.getContractValue())
                        .subtotal(contract.getContractValue())
                        .currency(contract.getCurrency())
                        .billingPeriodStart(contract.getStartDate().atStartOfDay())
                        .billingPeriodEnd(contract.getEndDate().atTime(23, 59, 59))
                        .dueDate(LocalDate.now().plusDays(14).atTime(23, 59, 59))
                        .paymentGateway("BANK_TRANSFER")
                        .notes("Hóa đơn phát hành tự động theo Hợp đồng số " + contract.getContractNumber() + " (" + contract.getTitle() + ")")
                        .build();

                billingService.createInvoice(invoiceReq);
                log.info("Auto-generated B2B Invoice for signed Contract {}", contract.getContractNumber());
            }
        } catch (Exception e) {
            log.warn("Failed to auto-generate invoice for Contract {}: {}", contract.getContractNumber(), e.getMessage());
        }
    }

    @Transactional(transactionManager = "masterTransactionManager")
    public ContractResponse updateStatus(Long id, UpdateContractStatusRequest request) {
        Contract contract = contractRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Hợp đồng không tồn tại", HttpStatus.NOT_FOUND, "CONTRACT_NOT_FOUND"));

        String nextStatus = request.getStatus().toUpperCase();
        if (!VALID_STATUSES.contains(nextStatus)) {
            throw new BusinessException("Trạng thái hợp đồng không hợp lệ: " + nextStatus, HttpStatus.BAD_REQUEST, "INVALID_STATUS");
        }

        contract.setStatus(nextStatus);
        if (StringUtils.hasText(request.getNotes())) {
            contract.setNotes(request.getNotes());
        }

        Contract saved = contractRepository.save(contract);
        log.info("Updated status of Contract {} to {}", saved.getContractNumber(), nextStatus);

        TenantInfo tenant = saved.getTenantId() != null ? tenantRepository.findById(saved.getTenantId()).orElse(null) : null;
        SubscriptionPlan plan = saved.getPlanId() != null ? planRepository.findById(saved.getPlanId()).orElse(null) : null;

        return enrichContractResponse(saved, tenant, plan);
    }

    @Transactional(transactionManager = "masterTransactionManager")
    public void deleteContract(Long id) {
        Contract contract = contractRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Hợp đồng không tồn tại", HttpStatus.NOT_FOUND, "CONTRACT_NOT_FOUND"));

        if ("SIGNED".equals(contract.getStatus())) {
            throw new BusinessException("Không thể xóa hợp đồng đã được ký kết và có hiệu lực pháp lý", HttpStatus.BAD_REQUEST, "CANNOT_DELETE_SIGNED_CONTRACT");
        }

        contractRepository.delete(contract);
        log.info("Deleted Contract: {}", contract.getContractNumber());
    }

    private String generateContractNumber() {
        String datePart = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMM"));
        for (int attempt = 0; attempt < 5; attempt++) {
            int randomSuffix = ThreadLocalRandom.current().nextInt(1000, 9999);
            String candidate = String.format("CTR-%s-%04d", datePart, randomSuffix);
            if (contractRepository.findByContractNumber(candidate).isEmpty()) {
                return candidate;
            }
        }
        return "CTR-" + datePart + "-" + System.currentTimeMillis() % 10000;
    }

    private String convertMoneyToVietnameseWords(BigDecimal amount, String currency) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            return "Không đồng";
        }
        long longVal = amount.longValue();
        if ("USD".equalsIgnoreCase(currency)) {
            return longVal + " Đô la Mỹ (quy đổi theo tỷ giá Vietcombank tại thời điểm thanh toán)";
        }
        return String.format("%,d Đồng (đã bao gồm thuế GTGT)", longVal);
    }

    private ContractResponse enrichContractResponse(Contract contract, Map<Long, TenantInfo> tenantMap, Map<Long, SubscriptionPlan> planMap) {
        TenantInfo tenant = contract.getTenantId() != null ? tenantMap.get(contract.getTenantId()) : null;
        SubscriptionPlan plan = contract.getPlanId() != null ? planMap.get(contract.getPlanId()) : null;
        return enrichContractResponse(contract, tenant, plan);
    }

    private ContractResponse enrichContractResponse(Contract contract, TenantInfo tenant, SubscriptionPlan plan) {
        ContractResponse res = ContractResponse.from(contract);
        if (tenant != null) {
            res.setTenantName(tenant.getName());
            res.setTenantCode(tenant.getCode());
            res.setTenantSubdomain(tenant.getSubdomain());
        }
        if (plan != null) {
            res.setPlanName(plan.getName());
            res.setPlanCode(plan.getCode());
        }
        List<ContractSignature> signatures = signatureRepository.findByContractId(contract.getId());
        res.setSignatures(signatures.stream().map(ContractSignatureResponse::from).toList());
        return res;
    }
}
