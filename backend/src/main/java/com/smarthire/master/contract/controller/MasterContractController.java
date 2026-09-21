package com.smarthire.master.contract.controller;

import com.smarthire.common.api.ApiResponse;
import com.smarthire.master.contract.dto.ContractResponse;
import com.smarthire.master.contract.dto.CreateContractRequest;
import com.smarthire.master.contract.dto.SignContractRequest;
import com.smarthire.master.contract.dto.UpdateContractStatusRequest;
import com.smarthire.master.contract.service.MasterContractService;
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
@RequestMapping("/api/v1/master/contracts")
@RequiredArgsConstructor
@Tag(name = "Master B2B Contracts & Digital Signing", description = "Endpoints for managing B2B e-Contracts and digital signatures")
@PreAuthorize("hasRole('WORKSPACE_ADMIN')")
public class MasterContractController {

    private final MasterContractService contractService;

    @GetMapping
    @Operation(summary = "List all B2B Contracts", description = "Retrieves all contracts with optional filters by status or tenantId.")
    public ResponseEntity<ApiResponse<List<ContractResponse>>> getAllContracts(
            @RequestParam(required = false, defaultValue = "ALL") String status,
            @RequestParam(required = false) Long tenantId) {
        List<ContractResponse> contracts = contractService.getAllContracts(status, tenantId);
        return ResponseEntity.ok(ApiResponse.ok("Danh sách hợp đồng B2B", contracts));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get Contract Details", description = "Retrieves complete contract details by ID.")
    public ResponseEntity<ApiResponse<ContractResponse>> getContractById(@PathVariable Long id) {
        ContractResponse contract = contractService.getContractById(id);
        return ResponseEntity.ok(ApiResponse.ok("Chi tiết hợp đồng", contract));
    }

    @PostMapping
    @Operation(summary = "Create B2B Contract", description = "Creates a new B2B contract in PENDING_SIGNATURE status.")
    public ResponseEntity<ApiResponse<ContractResponse>> createContract(@Valid @RequestBody CreateContractRequest request) {
        ContractResponse contract = contractService.createContract(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Hợp đồng B2B đã được tạo thành công", contract));
    }

    @PostMapping("/{id}/send")
    @Operation(summary = "Send Contract to Client", description = "Generates secure signing token and sends invitation email to party B signer.")
    public ResponseEntity<ApiResponse<ContractResponse>> sendContract(@PathVariable Long id) {
        ContractResponse contract = contractService.sendContract(id);
        return ResponseEntity.ok(ApiResponse.ok("Đã gửi liên kết ký hợp đồng điện tử đến khách hàng", contract));
    }

    @PostMapping("/{id}/sign")
    @Operation(summary = "Sign B2B Contract", description = "Marks contract as SIGNED via USB Token, e-Signature, or signed PDF upload, and optionally creates B2B Invoice.")
    public ResponseEntity<ApiResponse<ContractResponse>> signContract(
            @PathVariable Long id,
            @Valid @RequestBody SignContractRequest request) {
        ContractResponse contract = contractService.signContract(id, request);
        return ResponseEntity.ok(ApiResponse.ok("Hợp đồng đã được ký kết và có hiệu lực pháp lý", contract));
    }

    @PatchMapping("/{id}/status")
    @Operation(summary = "Update Contract Status", description = "Updates status of contract (e.g. EXPIRED, TERMINATED).")
    public ResponseEntity<ApiResponse<ContractResponse>> updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateContractStatusRequest request) {
        ContractResponse contract = contractService.updateStatus(id, request);
        return ResponseEntity.ok(ApiResponse.ok("Cập nhật trạng thái hợp đồng thành công", contract));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete Draft Contract", description = "Deletes a draft or expired contract.")
    public ResponseEntity<ApiResponse<Void>> deleteContract(@PathVariable Long id) {
        contractService.deleteContract(id);
        return ResponseEntity.ok(ApiResponse.ok("Đã xóa hợp đồng thành công", null));
    }
}
