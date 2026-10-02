package com.smarthire.master.billing.service;

import com.smarthire.domain.master.entity.Invoice;
import com.smarthire.domain.master.entity.PaymentTransaction;
import com.smarthire.domain.master.repository.InvoiceRepository;
import com.smarthire.domain.master.repository.PaymentTransactionRepository;
import com.smarthire.master.billing.dto.SePayWebhookPayload;
import com.smarthire.master.billing.dto.SePayWebhookResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
public class SePayService {

    private final InvoiceRepository invoiceRepository;
    private final PaymentTransactionRepository paymentTransactionRepository;
    private final MasterBillingService masterBillingService;

    // Pattern 1: INV-202610-1234
    private static final Pattern INVOICE_PATTERN_HYPHEN = Pattern.compile("INV-\\d{6}-\\d{4}", Pattern.CASE_INSENSITIVE);
    // Pattern 2: INV2026101234
    private static final Pattern INVOICE_PATTERN_COMPACT = Pattern.compile("INV\\d{10}", Pattern.CASE_INSENSITIVE);

    @Transactional(transactionManager = "masterTransactionManager")
    public SePayWebhookResponse processWebhook(SePayWebhookPayload payload) {
        log.info("Processing SePay Webhook - Transaction ID: {}, Gateway: {}, Amount: {}, Content: '{}'",
                payload.getId(), payload.getGateway(), payload.getTransferAmount(), payload.getContent());

        if (payload.getId() == null) {
            log.warn("SePay Webhook rejected: missing transaction id");
            return SePayWebhookResponse.ok();
        }

        // 1. Chỉ xử lý giao dịch tiền vào ("in")
        if (StringUtils.hasText(payload.getTransferType()) && !"in".equalsIgnoreCase(payload.getTransferType().trim())) {
            log.info("SePay Webhook skipped: transferType is '{}' (not incoming)", payload.getTransferType());
            return SePayWebhookResponse.ok();
        }

        // 2. Chống trùng lặp (Idempotent) bằng SePay transaction ID
        String transactionRef = "SEPAY_" + payload.getId();
        Optional<PaymentTransaction> existingTxn = paymentTransactionRepository.findByTransactionNo(transactionRef);
        if (existingTxn.isPresent()) {
            log.info("SePay transaction #{} already processed previously. Skipping.", payload.getId());
            return SePayWebhookResponse.ok();
        }

        // 3. Trích xuất mã hóa đơn từ content hoặc code
        String invoiceNumber = extractInvoiceNumber(payload);
        if (!StringUtils.hasText(invoiceNumber)) {
            log.warn("SePay Webhook: Could not extract invoice number from content='{}' or code='{}'",
                    payload.getContent(), payload.getCode());
            return SePayWebhookResponse.ok();
        }

        // 4. Tìm kiếm hóa đơn tương ứng
        Optional<Invoice> invoiceOpt = invoiceRepository.findByInvoiceNumber(invoiceNumber);
        if (invoiceOpt.isEmpty()) {
            log.warn("SePay Webhook: Invoice not found for extracted number '{}'", invoiceNumber);
            return SePayWebhookResponse.ok();
        }

        Invoice invoice = invoiceOpt.get();
        log.info("SePay Webhook matched Invoice #{} (ID: {}, Current Status: {}, Expected Amount: {})",
                invoice.getInvoiceNumber(), invoice.getId(), invoice.getStatus(), invoice.getAmount());

        BigDecimal transferAmount = payload.getTransferAmount() != null ? payload.getTransferAmount() : BigDecimal.ZERO;

        // 5. Kiểm tra số tiền chuyển có đủ không
        if (transferAmount.compareTo(invoice.getAmount()) < 0) {
            log.warn("SePay Webhook: Transferred amount ({}) is less than required ({}) for invoice #{}",
                    transferAmount, invoice.getAmount(), invoice.getInvoiceNumber());

            PaymentTransaction partialTxn = PaymentTransaction.builder()
                    .invoiceId(invoice.getId())
                    .tenantId(invoice.getTenantId())
                    .txnRef(invoice.getInvoiceNumber())
                    .transactionNo(transactionRef)
                    .paymentGateway("SEPAY")
                    .bankCode(payload.getGateway())
                    .bankTranNo(payload.getReferenceCode())
                    .amount(transferAmount)
                    .currency("VND")
                    .responseCode("01")
                    .transactionStatus("AMOUNT_MISMATCH")
                    .orderInfo(payload.getContent())
                    .payDate(payload.getTransactionDate())
                    .rawResponse(payload.toString())
                    .build();
            paymentTransactionRepository.save(partialTxn);
            return SePayWebhookResponse.ok();
        }

        // 6. Ghi nhận giao dịch thành công
        PaymentTransaction successTxn = PaymentTransaction.builder()
                .invoiceId(invoice.getId())
                .tenantId(invoice.getTenantId())
                .txnRef(invoice.getInvoiceNumber())
                .transactionNo(transactionRef)
                .paymentGateway("SEPAY")
                .bankCode(payload.getGateway())
                .bankTranNo(payload.getReferenceCode())
                .amount(transferAmount)
                .currency("VND")
                .responseCode("00")
                .transactionStatus("SUCCESS")
                .orderInfo(payload.getContent())
                .payDate(payload.getTransactionDate())
                .rawResponse(payload.toString())
                .build();
        paymentTransactionRepository.save(successTxn);

        // 7. Kích hoạt hóa đơn và tự động cấp phát tài nguyên nếu chưa PAID
        if (!"PAID".equalsIgnoreCase(invoice.getStatus())) {
            log.info("SePay Webhook: Auto-approving and provisioning tenant for invoice #{}", invoice.getInvoiceNumber());
            masterBillingService.completePaidInvoice(
                    invoice.getId(),
                    "SEPAY",
                    String.valueOf(payload.getId()),
                    "SePay Webhook Auto-Approval (Bank: " + payload.getGateway() + ", Ref: " + payload.getReferenceCode() + ")"
            );
        }

        return SePayWebhookResponse.ok();
    }

    private String extractInvoiceNumber(SePayWebhookPayload payload) {
        String combined = (payload.getCode() != null ? payload.getCode() + " " : "")
                + (payload.getContent() != null ? payload.getContent() + " " : "")
                + (payload.getDescription() != null ? payload.getDescription() : "");

        if (!StringUtils.hasText(combined)) return null;

        // Thử khớp dạng có dấu gạch ngang: INV-202610-1234
        Matcher matcherHyphen = INVOICE_PATTERN_HYPHEN.matcher(combined);
        if (matcherHyphen.find()) {
            return matcherHyphen.group(0).toUpperCase();
        }

        // Thử khớp dạng viết liền không gạch ngang: INV2026101234
        Matcher matcherCompact = INVOICE_PATTERN_COMPACT.matcher(combined);
        if (matcherCompact.find()) {
            String compact = matcherCompact.group(0).toUpperCase();
            // Tách lại thành INV-YYYYMM-XXXX
            return compact.substring(0, 3) + "-" + compact.substring(3, 9) + "-" + compact.substring(9);
        }

        return null;
    }
}
