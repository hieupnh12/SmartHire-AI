package com.smarthire.tenant.auth.controller;

import com.smarthire.common.api.ApiResponse;
import com.smarthire.tenant.auth.dto.LoginRequest;
import com.smarthire.tenant.auth.dto.LoginResponse;
import com.smarthire.tenant.auth.dto.UserResponse;
import com.smarthire.tenant.auth.service.TenantAuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/tenant/auth")
@Tag(name = "Tenant Authentication", description = "Login, Logout, and JWT Profile Decoding APIs for Tenants")
public class TenantAuthController {

    private final TenantAuthService tenantAuthService;

    public TenantAuthController(TenantAuthService tenantAuthService) {
        this.tenantAuthService = tenantAuthService;
    }

    @PostMapping("/login")
    @Operation(summary = "Login Tenant User", description = "Authenticates Tenant User against Tenant DB and issues signed JWT Token.")
    public ResponseEntity<ApiResponse<LoginResponse>> login(@Valid @RequestBody LoginRequest request) {
        LoginResponse response = tenantAuthService.login(request);
        return ResponseEntity.ok(ApiResponse.ok("Login successful", response));
    }

    @GetMapping("/me")
    @Operation(summary = "Get Current User Profile", description = "Decodes JWT Bearer token and returns authenticated user profile.")
    public ResponseEntity<ApiResponse<UserResponse>> getCurrentUser(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        UserResponse response = tenantAuthService.getCurrentUser(authHeader);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }
}
