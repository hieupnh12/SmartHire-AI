package com.smarthire.tenant.auth.controller;

import com.smarthire.common.api.ApiResponse;
import com.smarthire.tenant.auth.dto.*;
import com.smarthire.tenant.auth.service.TenantAuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/tenant/auth")
@RequiredArgsConstructor
@Tag(name = "Tenant Authentication", description = "Login, Refresh, Logout, Password Recovery, and JWT Profile Decoding APIs for Tenants")
public class TenantAuthController {

    private final TenantAuthService tenantAuthService;

    @PostMapping("/login")
    @Operation(summary = "Login Tenant User", description = "Authenticates Tenant User against Tenant DB, applies rate-limiting, and issues signed JWT Access & Refresh Tokens.")
    public ResponseEntity<ApiResponse<LoginResponse>> login(@Valid @RequestBody LoginRequest request) {
        LoginResponse response = tenantAuthService.login(request);
        return ResponseEntity.ok(ApiResponse.ok("Login successful", response));
    }

    @PostMapping("/refresh")
    @Operation(summary = "Refresh Tenant Access Token", description = "Refreshes expired JWT Access Token using valid Refresh Token, rotating the Refresh Token.")
    public ResponseEntity<ApiResponse<LoginResponse>> refresh(@Valid @RequestBody TenantRefreshTokenRequest request) {
        LoginResponse response = tenantAuthService.refreshToken(request);
        return ResponseEntity.ok(ApiResponse.ok("Token refreshed successfully", response));
    }

    @PostMapping("/logout")
    @Operation(summary = "Logout Tenant User", description = "Revokes current JWT Token via Redis Blacklist and deletes refresh session.")
    public ResponseEntity<ApiResponse<Void>> logout(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody(required = false) TenantLogoutRequest request
    ) {
        tenantAuthService.logout(authHeader, request);
        return ResponseEntity.ok(ApiResponse.ok("Đăng xuất thành công", null));
    }

    @PostMapping("/forgot-password")
    @Operation(summary = "Forgot Password (Request OTP)", description = "Generates and sends an OTP to user email if the account exists in Tenant DB.")
    public ResponseEntity<ApiResponse<Void>> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        tenantAuthService.forgotPassword(request);
        return ResponseEntity.ok(ApiResponse.ok("Nếu tài khoản tồn tại trong hệ thống, mã xác thực OTP đã được gửi đến email của bạn.", null));
    }

    @PostMapping("/reset-password")
    @Operation(summary = "Reset Password with OTP", description = "Verifies OTP code and resets user password in Tenant DB.")
    public ResponseEntity<ApiResponse<Void>> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        tenantAuthService.resetPassword(request);
        return ResponseEntity.ok(ApiResponse.ok("Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại với mật khẩu mới.", null));
    }

    @PostMapping("/change-password")
    @Operation(summary = "Change Password", description = "Allows authenticated Tenant user to update their password.")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @Valid @RequestBody ChangePasswordRequest request
    ) {
        tenantAuthService.changePassword(authHeader, request);
        return ResponseEntity.ok(ApiResponse.ok("Đổi mật khẩu thành công", null));
    }

    @GetMapping("/me")
    @Operation(summary = "Get Current User Profile", description = "Decodes JWT Bearer token and returns authenticated user profile.")
    public ResponseEntity<ApiResponse<UserResponse>> getCurrentUser(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        UserResponse response = tenantAuthService.getCurrentUser(authHeader);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }
}
