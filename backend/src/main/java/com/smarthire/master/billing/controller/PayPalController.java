package com.smarthire.master.billing.controller;

import com.smarthire.common.api.ApiResponse;
import com.smarthire.master.billing.dto.PayPalVerifyReturnRequest;
import com.smarthire.master.billing.dto.PayPalVerifyReturnResponse;
import com.smarthire.master.billing.service.PayPalService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/v1/public/checkout/paypal")
@RequiredArgsConstructor
@Tag(name = "PayPal Checkout", description = "Public endpoints for PayPal Gateway Integration")
public class PayPalController {

    private final PayPalService payPalService;

    @PostMapping("/verify-return")
    @Operation(summary = "Verify PayPal Return Callback", description = "Called by the frontend after user completes PayPal payment on the frontend JS SDK.")
    public ResponseEntity<ApiResponse<PayPalVerifyReturnResponse>> verifyReturn(@Valid @RequestBody PayPalVerifyReturnRequest request) {
        PayPalVerifyReturnResponse response = payPalService.verifyReturn(request);
        return ResponseEntity.ok(ApiResponse.ok("Kết quả đối soát giao dịch PayPal", response));
    }
}
