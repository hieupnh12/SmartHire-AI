package com.smarthire.tenant.auth.controller;

import com.smarthire.common.api.ApiResponse;
import com.smarthire.tenant.auth.dto.CandidateLoginResponse;
import com.smarthire.tenant.auth.dto.GoogleLoginRequest;
import com.smarthire.tenant.auth.service.CandidateAuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/tenant/auth")
@RequiredArgsConstructor
@Tag(name = "Candidate Authentication", description = "Endpoints for Candidate Authentication and Google OAuth Sign-in")
public class CandidateAuthController {

    private final CandidateAuthService candidateAuthService;

    @PostMapping("/google")
    @Operation(
            summary = "Login/Register Candidate with Google ID Token",
            description = "Verifies Google ID Token, provisions Candidate user in Tenant DB if new, and returns JWT Access & Refresh tokens."
    )
    public ResponseEntity<ApiResponse<CandidateLoginResponse>> loginWithGoogle(
            @Valid @RequestBody GoogleLoginRequest request
    ) {
        CandidateLoginResponse response = candidateAuthService.authenticateWithGoogle(request);
        return ResponseEntity.ok(ApiResponse.ok("Candidate Google login successful", response));
    }
}
