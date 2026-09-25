package com.smarthire.master.billing.service;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.config.VnPayProperties;
import com.smarthire.domain.master.entity.Invoice;
import com.smarthire.domain.master.entity.PaymentTransaction;
import com.smarthire.domain.master.entity.TenantInfo;
import com.smarthire.domain.master.repository.InvoiceRepository;
import com.smarthire.domain.master.repository.PaymentTransactionRepository;
import com.smarthire.domain.master.repository.TenantInfoRepository;
import com.smarthire.master.billing.dto.*;
import com.smarthire.master.billing.util.VnPayUtil;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class VnPayService {

    private static final DateTimeFormatter VNPAY_DATE_FORMAT = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");
    private static final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final VnPayProperties vnPayProperties;
    private final InvoiceRepository invoiceRepository;
    private final TenantInfoRepository tenantRepository;
    private final MasterBillingService masterBillingService;
    private final PaymentTransactionRepository paymentTransactionRepository;

    @Transactional(transactionManager = "masterTransactionManager")
    public VnPayPaymentResponse createPaymentUrl(VnPayCreatePaymentRequest request, HttpServletRequest httpRequest) {
        Invoice invoice = invoiceRepository.findById(request.getInvoiceId())
                .orElseThrow(() -> new BusinessException("Hóa đơn không tồn tại: " + request.getInvoiceId(), HttpStatus.NOT_FOUND, "INVOICE_NOT_FOUND"));

        if ("PAID".equalsIgnoreCase(invoice.getStatus())) {
            throw new BusinessException("Hóa đơn này đã được thanh toán", HttpStatus.BAD_REQUEST, "INVOICE_ALREADY_PAID");
        }

        // VNPay requires amount in integer multiplied by 100 (e.g. 100,000 VND -> 10000000)
        BigDecimal amountVnd = invoice.getAmount();
        long vnpAmount = amountVnd.multiply(BigDecimal.valueOf(100)).longValue();

        LocalDateTime now = LocalDateTime.now(VIETNAM_ZONE);
        String createDate = now.format(VNPAY_DATE_FORMAT);
        String expireDate = now.plusMinutes(15).format(VNPAY_DATE_FORMAT);

        String returnUrl = StringUtils.hasText(request.getReturnUrl()) 
                ? request.getReturnUrl().trim() 
                : vnPayProperties.getReturnUrl();

        Map<String, String> vnpParams = new HashMap<>();
        vnpParams.put("vnp_Version", vnPayProperties.getVersion());
        vnpParams.put("vnp_Command", vnPayProperties.getCommand());
        vnpParams.put("vnp_TmnCode", vnPayProperties.getTmnCode());
        vnpParams.put("vnp_Amount", String.valueOf(vnpAmount));
        vnpParams.put("vnp_CurrCode", "VND");
        vnpParams.put("vnp_TxnRef", invoice.getInvoiceNumber());
        vnpParams.put("vnp_OrderInfo", "Thanh toan don hang " + invoice.getInvoiceNumber());
        vnpParams.put("vnp_OrderType", "other");
        vnpParams.put("vnp_Locale", "vn");
        vnpParams.put("vnp_ReturnUrl", returnUrl);
        vnpParams.put("vnp_IpAddr", VnPayUtil.getIpAddress(httpRequest));
        vnpParams.put("vnp_CreateDate", createDate);
        vnpParams.put("vnp_ExpireDate", expireDate);

        // Bank code: "VNBANK" for domestic ATM card, or specific bank like "NCB"
        if (StringUtils.hasText(request.getBankCode())) {
            vnpParams.put("vnp_BankCode", request.getBankCode().trim().toUpperCase());
        }

        // Build sorted parameter query and hashData string
        List<String> fieldNames = new ArrayList<>(vnpParams.keySet());
        Collections.sort(fieldNames);

        StringBuilder hashData = new StringBuilder();
        StringBuilder query = new StringBuilder();
        Iterator<String> itr = fieldNames.iterator();
        while (itr.hasNext()) {
            String fieldName = itr.next();
            String fieldValue = vnpParams.get(fieldName);
            if (StringUtils.hasText(fieldValue)) {
                hashData.append(fieldName).append('=').append(URLEncoder.encode(fieldValue, StandardCharsets.US_ASCII));
                query.append(URLEncoder.encode(fieldName, StandardCharsets.US_ASCII))
                     .append('=')
                     .append(URLEncoder.encode(fieldValue, StandardCharsets.US_ASCII));
                if (itr.hasNext()) {
                    query.append('&');
                    hashData.append('&');
                }
            }
        }

        String vnpSecureHash = VnPayUtil.hmacSHA512(vnPayProperties.getHashSecret(), hashData.toString());
        String paymentUrl = vnPayProperties.getPayUrl() + "?" + query + "&vnp_SecureHash=" + vnpSecureHash;

        invoice.setPaymentGateway("VNPAY");
        invoiceRepository.save(invoice);

        PaymentTransaction initTxn = PaymentTransaction.builder()
                .invoiceId(invoice.getId())
                .tenantId(invoice.getTenantId())
                .txnRef(invoice.getInvoiceNumber())
                .paymentGateway("VNPAY")
                .bankCode(request.getBankCode())
                .amount(amountVnd)
                .currency("VND")
                .transactionStatus("PENDING")
                .orderInfo("Thanh toan don hang " + invoice.getInvoiceNumber())
                .ipAddress(vnpParams.get("vnp_IpAddr"))
                .build();
        paymentTransactionRepository.save(initTxn);

        log.info("Generated VNPay payment URL for Invoice #{}, Amount: {} VND", invoice.getInvoiceNumber(), amountVnd);

        return VnPayPaymentResponse.builder()
                .paymentUrl(paymentUrl)
                .invoiceNumber(invoice.getInvoiceNumber())
                .amountVnd(amountVnd)
                .build();
    }

    @Transactional(transactionManager = "masterTransactionManager")
    public VnPayIpnResponse processIpn(Map<String, String> allParams) {
        log.info("Received VNPay IPN request: {}", allParams);

        String secureHash = allParams.get("vnp_SecureHash");
        if (!StringUtils.hasText(secureHash)) {
            return new VnPayIpnResponse("97", "Invalid Checksum");
        }

        Map<String, String> fields = new HashMap<>(allParams);
        fields.remove("vnp_SecureHash");
        fields.remove("vnp_SecureHashType");

        String calculatedHash = VnPayUtil.hashAllFields(fields, vnPayProperties.getHashSecret());
        if (!calculatedHash.equalsIgnoreCase(secureHash)) {
            log.warn("VNPay IPN Checksum mismatch. Received: {}, Calculated: {}", secureHash, calculatedHash);
            return new VnPayIpnResponse("97", "Invalid Checksum");
        }

        String invoiceNumber = allParams.get("vnp_TxnRef");
        Invoice invoice = invoiceRepository.findByInvoiceNumber(invoiceNumber).orElse(null);
        if (invoice == null) {
            log.warn("VNPay IPN: Invoice not found: {}", invoiceNumber);
            return new VnPayIpnResponse("01", "Order not Found");
        }

        long vnpAmount = Long.parseLong(allParams.getOrDefault("vnp_Amount", "0")) / 100;
        if (invoice.getAmount().longValue() != vnpAmount) {
            log.warn("VNPay IPN: Amount mismatch for Invoice #{}: expected {}, received {}", 
                    invoiceNumber, invoice.getAmount(), vnpAmount);
            return new VnPayIpnResponse("04", "Invalid Amount");
        }

        if ("PAID".equalsIgnoreCase(invoice.getStatus())) {
            log.info("VNPay IPN: Invoice #{} already paid.", invoiceNumber);
            return new VnPayIpnResponse("02", "Order already confirmed");
        }

        String responseCode = allParams.get("vnp_ResponseCode");
        String transactionNo = allParams.get("vnp_TransactionNo");

        if ("00".equals(responseCode)) {
            log.info("VNPay IPN Success: Invoice #{} paid with TransactionNo {}", invoiceNumber, transactionNo);
            masterBillingService.completePaidInvoice(invoice.getId(), "VNPAY", transactionNo, "VNPay IPN Auto-Approval");
        } else {
            log.info("VNPay IPN Payment failed for Invoice #{}: ResponseCode={}", invoiceNumber, responseCode);
        }

        PaymentTransaction ipnTxn = PaymentTransaction.builder()
                .invoiceId(invoice.getId())
                .tenantId(invoice.getTenantId())
                .txnRef(invoiceNumber)
                .transactionNo(transactionNo)
                .paymentGateway("VNPAY")
                .bankCode(allParams.get("vnp_BankCode"))
                .bankTranNo(allParams.get("vnp_BankTranNo"))
                .cardType(allParams.get("vnp_CardType"))
                .amount(BigDecimal.valueOf(vnpAmount))
                .currency("VND")
                .responseCode(responseCode)
                .transactionStatus("00".equals(responseCode) ? "SUCCESS" : "FAILED")
                .orderInfo(allParams.get("vnp_OrderInfo"))
                .payDate(allParams.get("vnp_PayDate"))
                .rawResponse(allParams.toString())
                .build();
        paymentTransactionRepository.save(ipnTxn);

        return new VnPayIpnResponse("00", "Confirm Success");
    }

    @Transactional(transactionManager = "masterTransactionManager")
    public VnPayVerifyReturnResponse verifyReturn(Map<String, String> allParams) {
        log.info("Verifying VNPay return callback: {}", allParams);

        String secureHash = allParams.get("vnp_SecureHash");
        if (!StringUtils.hasText(secureHash)) {
            return VnPayVerifyReturnResponse.builder()
                    .success(false)
                    .responseCode("97")
                    .message("Thiếu mã băm bảo mật chữ ký")
                    .build();
        }

        Map<String, String> fields = new HashMap<>(allParams);
        fields.remove("vnp_SecureHash");
        fields.remove("vnp_SecureHashType");

        String calculatedHash = VnPayUtil.hashAllFields(fields, vnPayProperties.getHashSecret());
        if (!calculatedHash.equalsIgnoreCase(secureHash)) {
            log.warn("VNPay return Checksum mismatch. Expected: {}, Received: {}", calculatedHash, secureHash);
            return VnPayVerifyReturnResponse.builder()
                    .success(false)
                    .responseCode("97")
                    .message("Chữ ký bảo mật không khớp hoặc đã bị thay đổi dữ liệu")
                    .build();
        }

        String invoiceNumber = allParams.get("vnp_TxnRef");
        Invoice invoice = invoiceRepository.findByInvoiceNumber(invoiceNumber)
                .orElseThrow(() -> new BusinessException("Hóa đơn không tồn tại: " + invoiceNumber, HttpStatus.NOT_FOUND, "INVOICE_NOT_FOUND"));

        String responseCode = allParams.get("vnp_ResponseCode");
        String transactionNo = allParams.get("vnp_TransactionNo");
        String bankCode = allParams.get("vnp_BankCode");
        String payDate = allParams.get("vnp_PayDate");

        TenantInfo tenant = tenantRepository.findById(invoice.getTenantId()).orElse(null);

        PaymentTransaction returnTxn = PaymentTransaction.builder()
                .invoiceId(invoice.getId())
                .tenantId(invoice.getTenantId())
                .txnRef(invoiceNumber)
                .transactionNo(transactionNo)
                .paymentGateway("VNPAY")
                .bankCode(bankCode)
                .bankTranNo(allParams.get("vnp_BankTranNo"))
                .cardType(allParams.get("vnp_CardType"))
                .amount(invoice.getAmount())
                .currency("VND")
                .responseCode(responseCode)
                .transactionStatus("00".equals(responseCode) ? "SUCCESS" : "FAILED")
                .orderInfo(allParams.get("vnp_OrderInfo"))
                .payDate(payDate)
                .rawResponse(allParams.toString())
                .build();
        paymentTransactionRepository.save(returnTxn);

        if ("00".equals(responseCode)) {
            // Idempotent auto-activation if IPN hasn't finished yet
            if (!"PAID".equalsIgnoreCase(invoice.getStatus())) {
                masterBillingService.completePaidInvoice(invoice.getId(), "VNPAY", transactionNo, "VNPay Web Return Auto-Approval");
                tenant = tenantRepository.findById(invoice.getTenantId()).orElse(tenant);
            }

            return VnPayVerifyReturnResponse.builder()
                    .success(true)
                    .responseCode("00")
                    .message("Thanh toán thành công qua cổng VNPay!")
                    .invoiceNumber(invoice.getInvoiceNumber())
                    .tenantId(invoice.getTenantId())
                    .subdomain(tenant != null ? tenant.getSubdomain() : null)
                    .workspaceName(tenant != null ? tenant.getName() : null)
                    .contactEmail(tenant != null ? tenant.getContactEmail() : null)
                    .amountVnd(invoice.getAmount())
                    .transactionNo(transactionNo)
                    .bankCode(bankCode)
                    .payDate(payDate)
                    .build();
        } else {
            String errorMsg = mapVnPayResponseCode(responseCode);
            return VnPayVerifyReturnResponse.builder()
                    .success(false)
                    .responseCode(responseCode)
                    .message(errorMsg)
                    .invoiceNumber(invoice.getInvoiceNumber())
                    .tenantId(invoice.getTenantId())
                    .subdomain(tenant != null ? tenant.getSubdomain() : null)
                    .amountVnd(invoice.getAmount())
                    .transactionNo(transactionNo)
                    .bankCode(bankCode)
                    .build();
        }
    }

    private String mapVnPayResponseCode(String responseCode) {
        return switch (responseCode) {
            case "07" -> "Trừ tiền thành công. Giao dịch bị nghi ngờ (liên quan tới lừa đảo, bất thường).";
            case "09" -> "Thẻ hoặc tài khoản của quý khách chưa đăng ký dịch vụ InternetBanking.";
            case "10" -> "Khách hàng xác thực thông tin thẻ/tài khoản không đúng quá 3 lần.";
            case "11" -> "Đã hết hạn chờ thanh toán. Xin vui lòng thực hiện lại giao dịch.";
            case "12" -> "Thẻ hoặc tài khoản của quý khách bị khóa.";
            case "13" -> "Quý khách nhập sai mật khẩu xác thực giao dịch (OTP). Xin vui lòng thử lại.";
            case "24" -> "Giao dịch đã bị hủy bởi người dùng.";
            case "51" -> "Tài khoản của quý khách không đủ số dư để thực hiện giao dịch.";
            case "65" -> "Tài khoản của quý khách đã vượt quá hạn mức giao dịch trong ngày.";
            case "75" -> "Ngân hàng thanh toán đang bảo trì. Vui lòng thử lại sau.";
            case "79" -> "Quý khách nhập sai mật khẩu thanh toán quá số lần quy định.";
            default -> "Giao dịch không thành công qua cổng VNPay (Mã lỗi: " + responseCode + ").";
        };
    }
}
