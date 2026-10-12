package com.smarthire.master.contract.controller;

import com.smarthire.common.api.ApiResponse;
import com.smarthire.master.contract.dto.ContractResponse;
import com.smarthire.master.contract.service.MasterContractService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/public/contracts")
@RequiredArgsConstructor
@Tag(name = "Public B2B Contract Signing Portal", description = "Public endpoints for clients to view contracts, download PDF + Audit Trail, and receive Dropbox Sign webhooks")
public class PublicContractController {

    private final MasterContractService contractService;

    @GetMapping("/{token}")
    @Operation(summary = "Get Contract by Signing Token", description = "Allows external clients to view contract details and digital signature status via their secure signing token.")
    public ResponseEntity<ApiResponse<ContractResponse>> getContractByToken(@PathVariable String token) {
        ContractResponse contract = contractService.getContractBySigningToken(token);
        return ResponseEntity.ok(ApiResponse.ok("Chi tiết hợp đồng điện tử", contract));
    }

    @PostMapping("/{token}/sync-esign")
    @Operation(summary = "Sync Dropbox Sign Status by Token", description = "Checks Dropbox Sign API for latest signature status and downloads the signed PDF + Audit Trail if completed.")
    public ResponseEntity<ApiResponse<ContractResponse>> syncEsignByToken(
            @PathVariable String token,
            jakarta.servlet.http.HttpServletRequest httpRequest) {
        String clientIp = com.smarthire.master.billing.util.VnPayUtil.getIpAddress(httpRequest);
        ContractResponse contract = contractService.syncDropboxSignStatusByToken(token, clientIp);
        return ResponseEntity.ok(ApiResponse.ok("Đã đồng bộ trạng thái ký hợp đồng từ Dropbox Sign", contract));
    }

    @GetMapping(value = "/{token}/pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    @Operation(summary = "Download Contract PDF by Token", description = "Downloads the Dropbox Sign signed PDF with Audit Trail (if signed) or generated B2B contract PDF.")
    public ResponseEntity<byte[]> downloadContractPdfByToken(@PathVariable String token) {
        ContractResponse contract = contractService.getContractBySigningToken(token);
        byte[] pdfBytes = contractService.getContractPdfBytesByToken(token);
        String filename = (contract.getContractNumber() != null ? contract.getContractNumber() : "contract") + ".pdf";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdfBytes);
    }

    @PostMapping(value = "/webhook/dropbox-sign", produces = MediaType.TEXT_PLAIN_VALUE)
    @Operation(summary = "Dropbox Sign Webhook Receiver", description = "Receives Dropbox Sign callback events (multipart/form-data 'json' field or raw JSON), verifies HMAC-SHA256, and returns 'Hello API Event Received'.")
    public ResponseEntity<String> handleDropboxSignWebhook(
            @RequestParam(value = "json", required = false) String formJsonPayload,
            @RequestBody(required = false) String rawBodyPayload,
            jakarta.servlet.http.HttpServletRequest httpRequest) {
        String payload = (formJsonPayload != null && !formJsonPayload.isBlank()) ? formJsonPayload : rawBodyPayload;
        String clientIp = com.smarthire.master.billing.util.VnPayUtil.getIpAddress(httpRequest);
        String responseText = contractService.handleDropboxSignWebhook(payload, clientIp);
        return ResponseEntity.ok(responseText);
    }
}

