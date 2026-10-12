package com.smarthire.master.billing.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.smarthire.common.exception.BusinessException;
import com.smarthire.config.PayPalProperties;
import com.smarthire.domain.master.entity.Invoice;
import com.smarthire.domain.master.entity.PaymentTransaction;
import com.smarthire.domain.master.entity.TenantInfo;
import com.smarthire.domain.master.repository.InvoiceRepository;
import com.smarthire.domain.master.repository.PaymentTransactionRepository;
import com.smarthire.domain.master.repository.TenantInfoRepository;
import com.smarthire.master.billing.dto.PayPalVerifyReturnRequest;
import com.smarthire.master.billing.dto.PayPalVerifyReturnResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class PayPalService {

    private static final BigDecimal VND_TO_USD_RATE = BigDecimal.valueOf(25000);
    private static final BigDecimal USD_TOLERANCE = new BigDecimal("0.05");

    private final PayPalProperties payPalProperties;
    private final InvoiceRepository invoiceRepository;
    private final TenantInfoRepository tenantRepository;
    private final MasterBillingService masterBillingService;
    private final PaymentTransactionRepository paymentTransactionRepository;
    
    private final RestTemplate restTemplate = new RestTemplate();

    private String getBaseUrl() {
        return "sandbox".equalsIgnoreCase(payPalProperties.getMode()) 
                ? "https://api-m.sandbox.paypal.com" 
                : "https://api-m.paypal.com";
    }

    private String getAccessToken() {
        String url = getBaseUrl() + "/v1/oauth2/token";
        
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        headers.setBasicAuth(payPalProperties.getClientId(), payPalProperties.getClientSecret());
        
        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("grant_type", "client_credentials");
        
        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(body, headers);
        
        try {
            ResponseEntity<JsonNode> response = restTemplate.postForEntity(url, request, JsonNode.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                return response.getBody().get("access_token").asText();
            }
        } catch (Exception e) {
            log.error("Failed to get PayPal access token", e);
        }
        throw new BusinessException("Không thể kết nối đến PayPal", HttpStatus.INTERNAL_SERVER_ERROR, "PAYPAL_AUTH_ERROR");
    }

    @Transactional(transactionManager = "masterTransactionManager")
    public PayPalVerifyReturnResponse verifyReturn(PayPalVerifyReturnRequest request) {
        log.info("Verifying PayPal order: {} for invoice: {}", request.getOrderId(), request.getInvoiceId());

        Invoice invoice = invoiceRepository.findById(request.getInvoiceId())
                .orElseThrow(() -> new BusinessException("Hóa đơn không tồn tại", HttpStatus.NOT_FOUND, "INVOICE_NOT_FOUND"));

        TenantInfo tenant = invoice.getTenantId() != null 
                ? tenantRepository.findById(invoice.getTenantId()).orElse(null) 
                : null;

        // 1. Prevent Order ID replay across different invoices & handle idempotent retries
        Optional<PaymentTransaction> existingTxnOpt = paymentTransactionRepository.findByTransactionNo(request.getOrderId());
        if (existingTxnOpt.isPresent()) {
            PaymentTransaction existingTxn = existingTxnOpt.get();
            if (!invoice.getId().equals(existingTxn.getInvoiceId())) {
                log.warn("PayPal order replay attempt detected: orderId={} already linked to invoiceId={}, attempted on invoiceId={}",
                        request.getOrderId(), existingTxn.getInvoiceId(), invoice.getId());
                throw new BusinessException(
                        "Mã giao dịch PayPal đã được sử dụng cho một hóa đơn khác",
                        HttpStatus.CONFLICT,
                        "PAYPAL_ORDER_REPLAY");
            }
            if ("PAID".equalsIgnoreCase(invoice.getStatus()) && "SUCCESS".equalsIgnoreCase(existingTxn.getTransactionStatus())) {
                return PayPalVerifyReturnResponse.builder()
                        .success(true)
                        .responseCode("00")
                        .message("Thanh toán PayPal thành công!")
                        .invoiceNumber(invoice.getInvoiceNumber())
                        .tenantId(invoice.getTenantId())
                        .subdomain(tenant != null ? tenant.getSubdomain() : null)
                        .workspaceName(tenant != null ? tenant.getName() : null)
                        .contactEmail(tenant != null ? tenant.getContactEmail() : null)
                        .amountVnd(invoice.getAmount())
                        .transactionNo(request.getOrderId())
                        .build();
            }
        }

        // 2. Fetch Order from PayPal
        String accessToken = getAccessToken();
        String url = getBaseUrl() + "/v2/checkout/orders/" + request.getOrderId();
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        HttpEntity<Void> entity = new HttpEntity<>(headers);

        try {
            ResponseEntity<JsonNode> response = restTemplate.exchange(url, HttpMethod.GET, entity, JsonNode.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                JsonNode order = response.getBody();
                String status = order.path("status").asText("");

                // 3. Validate purchase_units metadata & amount before capturing/completing
                validateOrderMatchesInvoice(order, invoice);

                // 4. If order is only APPROVED (not yet captured on client), capture it server-side
                if ("APPROVED".equalsIgnoreCase(status)) {
                    HttpHeaders captureHeaders = new HttpHeaders();
                    captureHeaders.setBearerAuth(accessToken);
                    captureHeaders.setContentType(MediaType.APPLICATION_JSON);
                    HttpEntity<String> captureEntity = new HttpEntity<>("{}", captureHeaders);
                    ResponseEntity<JsonNode> captureRes = restTemplate.exchange(
                            url + "/capture", HttpMethod.POST, captureEntity, JsonNode.class);
                    if (captureRes.getStatusCode().is2xxSuccessful() && captureRes.getBody() != null) {
                        order = captureRes.getBody();
                        status = order.path("status").asText(status);
                    }
                }

                boolean isCompleted = "COMPLETED".equalsIgnoreCase(status);
                PaymentTransaction returnTxn = existingTxnOpt.orElseGet(() -> PaymentTransaction.builder()
                        .invoiceId(invoice.getId())
                        .tenantId(invoice.getTenantId())
                        .txnRef(invoice.getInvoiceNumber())
                        .transactionNo(request.getOrderId())
                        .paymentGateway("PAYPAL")
                        .amount(invoice.getAmount())
                        .currency("VND")
                        .build());
                returnTxn.setResponseCode(status);
                returnTxn.setTransactionStatus(isCompleted ? "SUCCESS" : "FAILED");
                returnTxn.setRawResponse(order.toString());
                paymentTransactionRepository.save(returnTxn);

                if (isCompleted) {
                    if (!"PAID".equalsIgnoreCase(invoice.getStatus())) {
                        masterBillingService.completePaidInvoice(invoice.getId(), "PAYPAL", request.getOrderId(), "PayPal Verification");
                        tenant = tenantRepository.findById(invoice.getTenantId()).orElse(tenant);
                    }
                    
                    return PayPalVerifyReturnResponse.builder()
                            .success(true)
                            .responseCode("00")
                            .message("Thanh toán PayPal thành công!")
                            .invoiceNumber(invoice.getInvoiceNumber())
                            .tenantId(invoice.getTenantId())
                            .subdomain(tenant != null ? tenant.getSubdomain() : null)
                            .workspaceName(tenant != null ? tenant.getName() : null)
                            .contactEmail(tenant != null ? tenant.getContactEmail() : null)
                            .amountVnd(invoice.getAmount())
                            .transactionNo(request.getOrderId())
                            .build();
                } else {
                    return PayPalVerifyReturnResponse.builder()
                            .success(false)
                            .responseCode(status)
                            .message("Giao dịch PayPal chưa hoàn tất: " + status)
                            .invoiceNumber(invoice.getInvoiceNumber())
                            .tenantId(invoice.getTenantId())
                            .subdomain(tenant != null ? tenant.getSubdomain() : null)
                            .amountVnd(invoice.getAmount())
                            .transactionNo(request.getOrderId())
                            .build();
                }
            }
        } catch (Exception e) {
            log.error("Failed to process PayPal order details", e);
            if (e instanceof RuntimeException) {
                throw (RuntimeException) e;
            }
            throw new RuntimeException(e);
        }

        return PayPalVerifyReturnResponse.builder()
                .success(false)
                .responseCode("ERROR")
                .message("Lỗi khi xác thực giao dịch với PayPal")
                .invoiceNumber(invoice.getInvoiceNumber())
                .build();
    }

    private void validateOrderMatchesInvoice(JsonNode order, Invoice invoice) {
        JsonNode units = order.path("purchase_units");
        if (!units.isArray() || units.isEmpty()) {
            return;
        }
        JsonNode unit = units.get(0);

        String customId = unit.path("custom_id").asText("").trim();
        if (!customId.isEmpty() && !customId.equals(String.valueOf(invoice.getId()))) {
            throw new BusinessException(
                    "Đơn hàng PayPal không thuộc về hóa đơn này (custom_id mismatch)",
                    HttpStatus.BAD_REQUEST,
                    "PAYPAL_INVOICE_MISMATCH");
        }

        String paypalInvoiceId = unit.path("invoice_id").asText("").trim();
        if (!paypalInvoiceId.isEmpty() && !paypalInvoiceId.equalsIgnoreCase(invoice.getInvoiceNumber())) {
            throw new BusinessException(
                    "Mã hóa đơn trên PayPal không khớp với hóa đơn hệ thống",
                    HttpStatus.BAD_REQUEST,
                    "PAYPAL_INVOICE_MISMATCH");
        }

        String description = unit.path("description").asText("").trim();
        if (!description.isEmpty() && invoice.getInvoiceNumber() != null
                && !description.contains(invoice.getInvoiceNumber())) {
            throw new BusinessException(
                    "Mô tả đơn hàng PayPal không khớp với mã hóa đơn " + invoice.getInvoiceNumber(),
                    HttpStatus.BAD_REQUEST,
                    "PAYPAL_INVOICE_MISMATCH");
        }

        JsonNode amountNode = unit.path("amount");
        if (amountNode.isObject() && invoice.getAmount() != null) {
            String currencyCode = amountNode.path("currency_code").asText("USD");
            String valueStr = amountNode.path("value").asText("");
            if (!valueStr.isEmpty()) {
                BigDecimal paidUsd = new BigDecimal(valueStr);
                BigDecimal expectedUsd = "USD".equalsIgnoreCase(invoice.getCurrency())
                        ? invoice.getAmount().setScale(2, RoundingMode.HALF_UP)
                        : invoice.getAmount().divide(VND_TO_USD_RATE, 2, RoundingMode.HALF_UP);
                if (!"USD".equalsIgnoreCase(currencyCode)
                        || paidUsd.subtract(expectedUsd).abs().compareTo(USD_TOLERANCE) > 0) {
                    throw new BusinessException(
                            String.format("Số tiền thanh toán PayPal (%s %s) không khớp với hóa đơn (%s USD)",
                                    valueStr, currencyCode, expectedUsd.toPlainString()),
                            HttpStatus.BAD_REQUEST,
                            "PAYPAL_AMOUNT_MISMATCH");
                }
            }
        }
    }
}
