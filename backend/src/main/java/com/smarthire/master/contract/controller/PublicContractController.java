package com.smarthire.master.contract.controller;

import com.smarthire.common.api.ApiResponse;
import com.smarthire.master.contract.dto.ContractResponse;
import com.smarthire.master.contract.dto.PublicSignOtpRequest;
import com.smarthire.master.contract.dto.PublicSignTokenRequest;
import com.smarthire.master.contract.service.MasterContractService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/public/contracts")
@RequiredArgsConstructor
@Tag(name = "Public B2B Contract Signing Portal", description = "Public endpoints for clients to view and digitally sign contracts")
public class PublicContractController {

    private final MasterContractService contractService;

    @GetMapping("/{token}")
    @Operation(summary = "Get Contract by Signing Token", description = "Allows external clients to view contract details via their secure signing token.")
    public ResponseEntity<ApiResponse<ContractResponse>> getContractByToken(@PathVariable String token) {
        ContractResponse contract = contractService.getContractBySigningToken(token);
        return ResponseEntity.ok(ApiResponse.ok("Chi tiết hợp đồng điện tử", contract));
    }

    @PostMapping("/{token}/request-otp")
    @Operation(summary = "Request e-Sign OTP", description = "Generates and sends a 6-digit OTP code to the party B representative email for verification.")
    public ResponseEntity<ApiResponse<Map<String, Object>>> requestOtp(@PathVariable String token) {
        Map<String, Object> result = contractService.requestSigningOtp(token);
        return ResponseEntity.ok(ApiResponse.ok("Mã xác thực OTP đã được gửi", result));
    }

    @PostMapping("/{token}/sign-otp")
    @Operation(summary = "e-Sign Contract with OTP", description = "Verifies OTP and digitally signs the contract.")
    public ResponseEntity<ApiResponse<ContractResponse>> signWithOtp(
            @PathVariable String token,
            @Valid @RequestBody PublicSignOtpRequest request,
            HttpServletRequest httpRequest) {
        String clientIp = httpRequest.getRemoteAddr();
        ContractResponse contract = contractService.publicSignWithOtp(
                token, request.getOtpCode(), request.getSignerName(), request.getSignerTitle(), clientIp);
        return ResponseEntity.ok(ApiResponse.ok("Ký hợp đồng điện tử thành công", contract));
    }

    @PostMapping("/{token}/sign-token-ca")
    @Operation(summary = "Sign Contract with CA USB Token", description = "Signs the contract with enterprise CA certificate serial info.")
    public ResponseEntity<ApiResponse<ContractResponse>> signWithTokenCa(
            @PathVariable String token,
            @Valid @RequestBody PublicSignTokenRequest request,
            HttpServletRequest httpRequest) {
        String clientIp = httpRequest.getRemoteAddr();
        ContractResponse contract = contractService.publicSignWithTokenCa(
                token, request.getTokenSerial(), request.getCaProvider(), request.getSignerName(), request.getSignerTitle(), clientIp);
        return ResponseEntity.ok(ApiResponse.ok("Ký số chứng thư CA thành công", contract));
    }
}
