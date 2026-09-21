package com.smarthire.master.billing.controller;

import com.smarthire.common.api.ApiResponse;
import com.smarthire.master.billing.dto.CreateInvoiceRequest;
import com.smarthire.master.billing.dto.InvoiceResponse;
import com.smarthire.master.billing.dto.UpdateInvoiceStatusRequest;
import com.smarthire.master.billing.service.MasterBillingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/master/invoices")
@RequiredArgsConstructor
@PreAuthorize("hasRole('WORKSPACE_ADMIN')")
@Tag(name = "Master Billing & Invoicing", description = "SaaS B2B Invoice & Payment Management APIs")
public class MasterBillingController {

    private final MasterBillingService billingService;

    @GetMapping
    @Operation(summary = "List all Invoices", description = "Returns B2B invoices filtered by status or tenant.")
    public ResponseEntity<ApiResponse<List<InvoiceResponse>>> getAllInvoices(
            @RequestParam(required = false, defaultValue = "ALL") String status,
            @RequestParam(required = false) Long tenantId) {
        List<InvoiceResponse> list = billingService.getAllInvoices(status, tenantId);
        return ResponseEntity.ok(ApiResponse.ok("Danh sách hóa đơn B2B", list));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get Invoice Details", description = "Returns invoice detail by ID.")
    public ResponseEntity<ApiResponse<InvoiceResponse>> getInvoiceById(@PathVariable Long id) {
        InvoiceResponse response = billingService.getInvoiceById(id);
        return ResponseEntity.ok(ApiResponse.ok("Chi tiết hóa đơn", response));
    }

    @PostMapping
    @Operation(summary = "Create New B2B Invoice", description = "Generates a new invoice and links subscription for a Tenant.")
    public ResponseEntity<ApiResponse<InvoiceResponse>> createInvoice(@Valid @RequestBody CreateInvoiceRequest request) {
        InvoiceResponse response = billingService.createInvoice(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Tạo hóa đơn thành công", response));
    }

    @PatchMapping("/{id}/status")
    @Operation(summary = "Update Invoice Payment Status", description = "Marks invoice as PAID or updates payment status.")
    public ResponseEntity<ApiResponse<InvoiceResponse>> updateInvoiceStatus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateInvoiceStatusRequest request) {
        InvoiceResponse response = billingService.updateInvoiceStatus(id, request);
        return ResponseEntity.ok(ApiResponse.ok("Cập nhật trạng thái thanh toán thành công", response));
    }
}
