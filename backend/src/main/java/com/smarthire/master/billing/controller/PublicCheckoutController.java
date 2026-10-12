package com.smarthire.master.billing.controller;

import com.smarthire.common.api.ApiResponse;
import com.smarthire.domain.master.repository.SubscriptionPlanRepository;
import com.smarthire.master.billing.dto.CheckoutRequest;
import com.smarthire.master.billing.dto.CheckoutResponse;
import com.smarthire.master.billing.service.MasterBillingService;
import com.smarthire.master.billing.util.VnPayUtil;
import com.smarthire.master.subscription.dto.SubscriptionPlanResponse;
import com.smarthire.master.subscription.mapper.SubscriptionPlanMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/public/checkout")
@RequiredArgsConstructor
@Tag(name = "Public Checkout", description = "Public APIs for Self-Service Plan Purchase & Subscription")
public class PublicCheckoutController {

    private final MasterBillingService billingService;
    private final SubscriptionPlanRepository planRepository;
    private final SubscriptionPlanMapper planMapper;

    @PostMapping
    @Operation(summary = "Submit Self-Service Checkout", description = "Registers workspace in pending payment state, records click-wrap legal consent audit trail, creates invoice and generates VietQR bank transfer details.")
    public ResponseEntity<ApiResponse<CheckoutResponse>> submitCheckout(
            @Valid @RequestBody CheckoutRequest request,
            HttpServletRequest httpRequest) {
        String clientIp = VnPayUtil.getIpAddress(httpRequest);
        String userAgent = httpRequest != null ? httpRequest.getHeader("User-Agent") : null;
        CheckoutResponse response = billingService.checkout(request, clientIp, userAgent);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Đăng ký mua gói dịch vụ thành công", response));
    }

    @GetMapping("/plans")
    @Operation(summary = "Get Public Subscription Plans", description = "Returns active, non-archived, non-custom subscription plans with VND pricing for checkout and landing page.")
    public ResponseEntity<ApiResponse<List<SubscriptionPlanResponse>>> getPublicPlans() {
        List<SubscriptionPlanResponse> plans = planRepository.findByStatusAndArchivedFalseAndCustomFalseOrderByPriceYearlyAsc("ACTIVE")
                .stream()
                .map(planMapper::toResponse)
                .toList();
        return ResponseEntity.ok(ApiResponse.ok("Danh sách gói cước", plans));
    }

    @GetMapping("/status/{invoiceId}")
    @Operation(summary = "Check Invoice Payment Status", description = "Returns payment and workspace provisioning status for a given invoice (used for real-time frontend polling).")
    public ResponseEntity<ApiResponse<com.smarthire.master.billing.dto.InvoiceStatusResponse>> checkInvoiceStatus(@PathVariable Long invoiceId) {
        com.smarthire.master.billing.dto.InvoiceStatusResponse status = billingService.getPublicInvoiceStatus(invoiceId);
        return ResponseEntity.ok(ApiResponse.ok("Trạng thái hóa đơn", status));
    }
}
