package com.smarthire.master.billing.controller;

import com.smarthire.common.api.ApiResponse;
import com.smarthire.master.billing.dto.VnPayCreatePaymentRequest;
import com.smarthire.master.billing.dto.VnPayIpnResponse;
import com.smarthire.master.billing.dto.VnPayPaymentResponse;
import com.smarthire.master.billing.dto.VnPayVerifyReturnResponse;
import com.smarthire.master.billing.service.VnPayService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/v1/public/checkout/vnpay")
@RequiredArgsConstructor
@Tag(name = "VNPay Checkout", description = "Public endpoints for VNPay Domestic ATM / QR Payment Gateway Integration")
public class VnPayController {

    private final VnPayService vnPayService;

    @PostMapping("/create-url")
    @Operation(summary = "Create VNPay Payment URL", description = "Generates secure URL with HMAC-SHA512 checksum for redirecting user to VNPay payment gateway.")
    public ResponseEntity<ApiResponse<VnPayPaymentResponse>> createPaymentUrl(
            @Valid @RequestBody VnPayCreatePaymentRequest request,
            HttpServletRequest httpRequest) {
        VnPayPaymentResponse response = vnPayService.createPaymentUrl(request, httpRequest);
        return ResponseEntity.ok(ApiResponse.ok("Khởi tạo đường dẫn thanh toán VNPay thành công", response));
    }

    @GetMapping("/ipn")
    @Operation(summary = "VNPay IPN Webhook", description = "Server-to-server webhook endpoint called asynchronously by VNPay to confirm transaction status.")
    public ResponseEntity<VnPayIpnResponse> handleIpn(@RequestParam Map<String, String> allParams) {
        VnPayIpnResponse response = vnPayService.processIpn(allParams);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/verify-return")
    @Operation(summary = "Verify VNPay Return Callback", description = "Called by the frontend after user completes payment and is redirected back from VNPay.")
    public ResponseEntity<ApiResponse<VnPayVerifyReturnResponse>> verifyReturn(@RequestParam Map<String, String> allParams) {
        VnPayVerifyReturnResponse response = vnPayService.verifyReturn(allParams);
        return ResponseEntity.ok(ApiResponse.ok("Kết quả đối soát giao dịch VNPay", response));
    }
}
