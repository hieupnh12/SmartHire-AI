package com.smarthire.master.contract.service;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.master.entity.Contract;
import com.smarthire.domain.master.entity.SubscriptionPlan;
import com.smarthire.domain.master.entity.TenantInfo;
import com.smarthire.domain.master.repository.ContractRepository;
import com.smarthire.domain.master.repository.ContractSignatureRepository;
import com.smarthire.domain.master.repository.SubscriptionPlanRepository;
import com.smarthire.domain.master.repository.TenantInfoRepository;
import com.smarthire.domain.master.entity.ContractSignature;
import com.smarthire.master.billing.dto.CreateInvoiceRequest;
import com.smarthire.master.billing.service.MasterBillingService;
import com.smarthire.master.contract.dto.ContractResponse;
import com.smarthire.master.contract.dto.ContractSignatureResponse;
import com.smarthire.master.contract.dto.CreateContractRequest;
import com.smarthire.master.contract.dto.SignContractRequest;
import com.smarthire.master.contract.dto.UpdateContractStatusRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ThreadLocalRandom;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class MasterContractService {

    private static final Set<String> VALID_STATUSES = Set.of("DRAFT", "PENDING_SIGNATURE", "SIGNED", "EXPIRED", "TERMINATED");
    private static final Set<String> VALID_SIGN_METHODS = Set.of("DIGITAL_TOKEN_CA", "E_SIGN_ONLINE", "UPLOAD_SIGNED_PDF", "MANUAL");

    private final ContractRepository contractRepository;
    private final ContractSignatureRepository signatureRepository;
    private final TenantInfoRepository tenantRepository;
    private final SubscriptionPlanRepository planRepository;
    private final MasterBillingService billingService;

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
                .termsAndConditions(request.getTermsAndConditions())
                .notes(request.getNotes())
                .build();

        Contract saved = contractRepository.save(contract);
        log.info("Created Vietnam Legal B2B Contract: {} for tenant: {} ({}) with token: {}", saved.getContractNumber(), tenant != null ? tenant.getName() : "Draft", tenant != null ? tenant.getCode() : "N/A", signingToken);

        return enrichContractResponse(saved, tenant, plan);
    }

    @Transactional(transactionManager = "masterTransactionManager")
    public ContractResponse sendContract(Long id) {
        Contract contract = contractRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Hợp đồng không tồn tại", HttpStatus.NOT_FOUND, "CONTRACT_NOT_FOUND"));

        if (!StringUtils.hasText(contract.getSigningToken())) {
            contract.setSigningToken(java.util.UUID.randomUUID().toString().replace("-", ""));
        }
        contract.setSentAt(LocalDateTime.now());
        contract.setTokenExpiresAt(LocalDateTime.now().plusDays(14));
        if ("DRAFT".equals(contract.getStatus())) {
            contract.setStatus("PENDING_SIGNATURE");
        }

        Contract saved = contractRepository.save(contract);
        log.info("Contract {} sent to client email: {} with signing token: {}", saved.getContractNumber(), saved.getPartyBEmail(), saved.getSigningToken());

        TenantInfo tenant = saved.getTenantId() != null ? tenantRepository.findById(saved.getTenantId()).orElse(null) : null;
        SubscriptionPlan plan = saved.getPlanId() != null ? planRepository.findById(saved.getPlanId()).orElse(null) : null;
        return enrichContractResponse(saved, tenant, plan);
    }

    @Transactional(transactionManager = "masterTransactionManager", readOnly = true)
    public ContractResponse getContractBySigningToken(String token) {
        Contract contract = contractRepository.findBySigningToken(token)
                .orElseThrow(() -> new BusinessException("Hợp đồng hoặc liên kết ký số không tồn tại hoặc đã hết hạn", HttpStatus.NOT_FOUND, "INVALID_SIGNING_TOKEN"));

        if (contract.getTokenExpiresAt() != null && LocalDateTime.now().isAfter(contract.getTokenExpiresAt())) {
            throw new BusinessException("Liên kết ký số hợp đồng này đã hết hạn. Vui lòng liên hệ SmartHire-AI để nhận liên kết mới.", HttpStatus.GONE, "SIGNING_TOKEN_EXPIRED");
        }

        TenantInfo tenant = contract.getTenantId() != null ? tenantRepository.findById(contract.getTenantId()).orElse(null) : null;
        SubscriptionPlan plan = contract.getPlanId() != null ? planRepository.findById(contract.getPlanId()).orElse(null) : null;
        return enrichContractResponse(contract, tenant, plan);
    }

    @Transactional(transactionManager = "masterTransactionManager")
    public Map<String, Object> requestSigningOtp(String token) {
        Contract contract = contractRepository.findBySigningToken(token)
                .orElseThrow(() -> new BusinessException("Liên kết ký số không hợp lệ", HttpStatus.NOT_FOUND, "INVALID_SIGNING_TOKEN"));

        if ("SIGNED".equals(contract.getStatus())) {
            throw new BusinessException("Hợp đồng đã được ký kết trước đó", HttpStatus.BAD_REQUEST, "CONTRACT_ALREADY_SIGNED");
        }

        ContractSignature signature = signatureRepository.findByContractIdAndStatus(contract.getId(), "PENDING")
                .orElseGet(() -> ContractSignature.builder()
                        .contractId(contract.getId())
                        .signerName(contract.getPartyBRepresentative() != null ? contract.getPartyBRepresentative() : "Đại diện có thẩm quyền")
                        .signerEmail(contract.getPartyBEmail() != null ? contract.getPartyBEmail() : "")
                        .signerTitle(contract.getPartyBPosition() != null ? contract.getPartyBPosition() : "Đại diện có thẩm quyền")
                        .status("PENDING")
                        .build());

        String otp = String.format("%06d", ThreadLocalRandom.current().nextInt(100000, 999999));
        signature.setOtpCode(otp);
        signature.setOtpExpiresAt(LocalDateTime.now().plusMinutes(15));
        signatureRepository.save(signature);

        log.info("Generated e-Sign OTP [{}] for contract {} sent to {}", otp, contract.getContractNumber(), contract.getPartyBEmail());

        return Map.of(
                "success", true,
                "message", "Mã xác thực OTP đã được gửi đến email " + (contract.getPartyBEmail() != null ? contract.getPartyBEmail() : "đại diện Bên B"),
                "email", contract.getPartyBEmail() != null ? contract.getPartyBEmail() : "",
                "expiresInMinutes", 15
        );
    }

    @Transactional(transactionManager = "masterTransactionManager")
    public ContractResponse publicSignWithOtp(String token, String otpCode, String signerName, String signerTitle, String clientIp) {
        Contract contract = contractRepository.findBySigningToken(token)
                .orElseThrow(() -> new BusinessException("Liên kết ký số không hợp lệ", HttpStatus.NOT_FOUND, "INVALID_SIGNING_TOKEN"));

        if ("SIGNED".equals(contract.getStatus())) {
            throw new BusinessException("Hợp đồng đã được ký kết trước đó", HttpStatus.BAD_REQUEST, "CONTRACT_ALREADY_SIGNED");
        }

        ContractSignature signature = signatureRepository.findByContractIdAndStatus(contract.getId(), "PENDING")
                .orElseThrow(() -> new BusinessException("Không tìm thấy yêu cầu ký kết hoặc OTP đã hết hạn", HttpStatus.BAD_REQUEST, "NO_PENDING_SIGNATURE"));

        if (signature.getOtpExpiresAt() == null || LocalDateTime.now().isAfter(signature.getOtpExpiresAt())) {
            throw new BusinessException("Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới.", HttpStatus.BAD_REQUEST, "OTP_EXPIRED");
        }

        if (!StringUtils.hasText(signature.getOtpCode()) || !signature.getOtpCode().trim().equals(otpCode.trim())) {
            throw new BusinessException("Mã OTP xác thực không chính xác", HttpStatus.BAD_REQUEST, "INVALID_OTP");
        }

        signature.setStatus("SIGNED");
        signature.setSignedAt(LocalDateTime.now());
        signature.setClientIp(clientIp);
        signature.setOtpCode(null);
        if (StringUtils.hasText(signerName)) {
            signature.setSignerName(signerName.trim());
            contract.setPartyBRepresentative(signerName.trim());
        }
        if (StringUtils.hasText(signerTitle)) {
            signature.setSignerTitle(signerTitle.trim());
            contract.setPartyBPosition(signerTitle.trim());
        }
        signatureRepository.save(signature);

        contract.setStatus("SIGNED");
        contract.setSignMethod("E_SIGN_ONLINE");
        contract.setSignedAt(LocalDateTime.now());
        contract.setClientIp(clientIp);

        Contract saved = contractRepository.save(contract);
        log.info("Contract {} e-signed via Email OTP successfully by {} (IP: {})", saved.getContractNumber(), signerName, clientIp);

        autoCreateInvoiceForSignedContract(saved);

        TenantInfo tenant = saved.getTenantId() != null ? tenantRepository.findById(saved.getTenantId()).orElse(null) : null;
        SubscriptionPlan plan = saved.getPlanId() != null ? planRepository.findById(saved.getPlanId()).orElse(null) : null;
        return enrichContractResponse(saved, tenant, plan);
    }

    @Transactional(transactionManager = "masterTransactionManager")
    public ContractResponse publicSignWithTokenCa(String token, String tokenSerial, String caProvider, String signerName, String signerTitle, String clientIp) {
        Contract contract = contractRepository.findBySigningToken(token)
                .orElseThrow(() -> new BusinessException("Liên kết ký số không hợp lệ", HttpStatus.NOT_FOUND, "INVALID_SIGNING_TOKEN"));

        if ("SIGNED".equals(contract.getStatus())) {
            throw new BusinessException("Hợp đồng đã được ký kết trước đó", HttpStatus.BAD_REQUEST, "CONTRACT_ALREADY_SIGNED");
        }

        contract.setStatus("SIGNED");
        contract.setSignMethod("DIGITAL_TOKEN_CA");
        contract.setSignedAt(LocalDateTime.now());
        contract.setClientIp(clientIp);
        contract.setNotes("Ký số CA Token Serial: " + tokenSerial + " | Nhà cung cấp: " + (caProvider != null ? caProvider : "Chữ ký số Doanh Nghiệp"));
        if (StringUtils.hasText(signerName)) contract.setPartyBRepresentative(signerName.trim());
        if (StringUtils.hasText(signerTitle)) contract.setPartyBPosition(signerTitle.trim());

        Contract saved = contractRepository.save(contract);
        log.info("Contract {} digitally signed via CA Token [{}] by {} (IP: {})", saved.getContractNumber(), tokenSerial, signerName, clientIp);

        autoCreateInvoiceForSignedContract(saved);

        TenantInfo tenant = saved.getTenantId() != null ? tenantRepository.findById(saved.getTenantId()).orElse(null) : null;
        SubscriptionPlan plan = saved.getPlanId() != null ? planRepository.findById(saved.getPlanId()).orElse(null) : null;
        return enrichContractResponse(saved, tenant, plan);
    }

    private void autoCreateInvoiceForSignedContract(Contract contract) {
        try {
            TenantInfo tenant = contract.getTenantId() != null ? tenantRepository.findById(contract.getTenantId()).orElse(null) : null;
            if (tenant != null) {
                CreateInvoiceRequest invoiceReq = CreateInvoiceRequest.builder()
                        .tenantId(tenant.getId())
                        .planId(contract.getPlanId())
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
    public ContractResponse signContract(Long id, SignContractRequest request) {
        Contract contract = contractRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Hợp đồng không tồn tại", HttpStatus.NOT_FOUND, "CONTRACT_NOT_FOUND"));

        if ("SIGNED".equals(contract.getStatus())) {
            throw new BusinessException("Hợp đồng đã được ký kết trước đó", HttpStatus.BAD_REQUEST, "CONTRACT_ALREADY_SIGNED");
        }

        String signMethod = request.getSignMethod().toUpperCase();
        if (!VALID_SIGN_METHODS.contains(signMethod)) {
            signMethod = "DIGITAL_TOKEN_CA";
        }

        contract.setStatus("SIGNED");
        contract.setSignMethod(signMethod);
        contract.setSignedAt(LocalDateTime.now());
        if (StringUtils.hasText(request.getSignedDocumentUrl())) {
            contract.setSignedDocumentUrl(request.getSignedDocumentUrl());
        }
        if (StringUtils.hasText(request.getDocumentChecksum())) {
            contract.setDocumentChecksum(request.getDocumentChecksum());
        }
        if (StringUtils.hasText(request.getNotes())) {
            contract.setNotes(request.getNotes());
        }

        Contract saved = contractRepository.save(contract);
        log.info("B2B Contract {} has been SIGNED successfully via method: {}", saved.getContractNumber(), saved.getSignMethod());

        if (request.isAutoCreateInvoice()) {
            autoCreateInvoiceForSignedContract(saved);
        }

        TenantInfo tenant = saved.getTenantId() != null ? tenantRepository.findById(saved.getTenantId()).orElse(null) : null;
        SubscriptionPlan plan = saved.getPlanId() != null ? planRepository.findById(saved.getPlanId()).orElse(null) : null;
        return enrichContractResponse(saved, tenant, plan);
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
        // Basic readable Vietnamese number words
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
