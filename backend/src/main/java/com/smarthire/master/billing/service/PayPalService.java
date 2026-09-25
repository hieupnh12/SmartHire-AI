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
import java.util.Base64;

@Slf4j
@Service
@RequiredArgsConstructor
public class PayPalService {

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

        // Fetch Order from PayPal
        String url = getBaseUrl() + "/v2/checkout/orders/" + request.getOrderId();
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(getAccessToken());
        HttpEntity<Void> entity = new HttpEntity<>(headers);

        try {
            ResponseEntity<JsonNode> response = restTemplate.exchange(url, HttpMethod.GET, entity, JsonNode.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                JsonNode order = response.getBody();
                String status = order.get("status").asText();
                
                PaymentTransaction returnTxn = PaymentTransaction.builder()
                        .invoiceId(invoice.getId())
                        .tenantId(invoice.getTenantId())
                        .txnRef(invoice.getInvoiceNumber())
                        .transactionNo(request.getOrderId())
                        .paymentGateway("PAYPAL")
                        .amount(invoice.getAmount())
                        .currency("VND") // Storing as VND internally
                        .responseCode(status)
                        .transactionStatus("COMPLETED".equalsIgnoreCase(status) ? "SUCCESS" : "FAILED")
                        .rawResponse(order.toString())
                        .build();
                paymentTransactionRepository.save(returnTxn);

                if ("COMPLETED".equalsIgnoreCase(status) || "APPROVED".equalsIgnoreCase(status)) {
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
}
