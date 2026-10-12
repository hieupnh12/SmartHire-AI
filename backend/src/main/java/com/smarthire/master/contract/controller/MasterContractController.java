package com.smarthire.master.contract.controller;

import com.smarthire.common.api.ApiResponse;
import com.smarthire.master.contract.dto.ContractResponse;
import com.smarthire.master.contract.dto.CreateContractRequest;
import com.smarthire.master.contract.dto.UpdateContractStatusRequest;
import com.smarthire.master.contract.service.MasterContractService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/master/contracts")
@RequiredArgsConstructor
@Tag(name = "Master B2B Contracts & Digital Signing", description = "Endpoints for managing B2B e-Contracts and digital signatures")
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

    @PutMapping("/{id}")
    @Operation(summary = "Update B2B Contract", description = "Updates a draft B2B contract details.")
    public ResponseEntity<ApiResponse<ContractResponse>> updateContract(
            @PathVariable Long id,
            @Valid @RequestBody com.smarthire.master.contract.dto.UpdateContractRequest request) {
        ContractResponse contract = contractService.updateContract(id, request);
        return ResponseEntity.ok(ApiResponse.ok("Cập nhật hợp đồng B2B thành công", contract));
    }

    @PostMapping("/{id}/send")
    @Operation(summary = "Send Contract via Dropbox Sign API", description = "Generates B2B Contract PDF, dispatches signature request via Dropbox Sign API, and emails Party B signer.")
    public ResponseEntity<ApiResponse<ContractResponse>> sendContract(@PathVariable Long id) {
        ContractResponse contract = contractService.sendContract(id);
        return ResponseEntity.ok(ApiResponse.ok("Đã gửi yêu cầu ký hợp đồng điện tử qua Dropbox Sign đến khách hàng", contract));
    }

    @PostMapping("/{id}/sync-esign")
    @Operation(summary = "Sync Dropbox Sign Status", description = "Polls Dropbox Sign API for latest signature status, downloads signed PDF + Audit Trail if complete, and updates contract.")
    public ResponseEntity<ApiResponse<ContractResponse>> syncEsignStatus(
            @PathVariable Long id,
            jakarta.servlet.http.HttpServletRequest httpRequest) {
        String clientIp = com.smarthire.master.billing.util.VnPayUtil.getIpAddress(httpRequest);
        ContractResponse contract = contractService.syncDropboxSignStatus(id, clientIp);
        return ResponseEntity.ok(ApiResponse.ok("Đã đồng bộ trạng thái ký số từ Dropbox Sign", contract));
    }

    @GetMapping(value = "/{id}/pdf", produces = org.springframework.http.MediaType.APPLICATION_PDF_VALUE)
    @Operation(summary = "Download Contract PDF", description = "Downloads the signed PDF + Dropbox Sign Audit Trail (if signed) or generated B2B contract PDF.")
    public ResponseEntity<byte[]> downloadContractPdf(@PathVariable Long id) {
        ContractResponse contract = contractService.getContractById(id);
        byte[] pdfBytes = contractService.getContractPdfBytesById(id);
        String filename = (contract.getContractNumber() != null ? contract.getContractNumber() : "contract-" + id) + ".pdf";
        return ResponseEntity.ok()
                .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(org.springframework.http.MediaType.APPLICATION_PDF)
                .body(pdfBytes);
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
