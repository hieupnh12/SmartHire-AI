package com.smarthire.master.admin.controller;

import com.smarthire.common.api.ApiResponse;
import com.smarthire.master.admin.dto.MasterLoginRequest;
import com.smarthire.master.admin.dto.MasterLoginResponse;
import com.smarthire.master.admin.dto.PlatformUserResponse;
import com.smarthire.master.admin.service.MasterAuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/master/auth")
@RequiredArgsConstructor
@Tag(name = "Platform Administration Auth", description = "Login and Profile APIs for Workspace Admins")
public class MasterAuthController {

    private final MasterAuthService masterAuthService;

    @PostMapping("/login")
    @Operation(summary = "Login Workspace Admin", description = "Authenticates Workspace Admin against Master DB and issues signed JWT Token.")
    public ResponseEntity<ApiResponse<MasterLoginResponse>> login(@Valid @RequestBody MasterLoginRequest request) {
        MasterLoginResponse response = masterAuthService.login(request);
        return ResponseEntity.ok(ApiResponse.ok("Workspace Admin login successful", response));
    }

    @PostMapping("/refresh")
    @Operation(summary = "Refresh Platform Admin Access Token", description = "Refreshes expired JWT Access Token using valid Refresh Token.")
    public ResponseEntity<ApiResponse<MasterLoginResponse>> refresh(@Valid @RequestBody com.smarthire.master.admin.dto.MasterRefreshTokenRequest request) {
        MasterLoginResponse response = masterAuthService.refreshToken(request);
        return ResponseEntity.ok(ApiResponse.ok("Token refreshed successfully", response));
    }

    @GetMapping("/me")
    @Operation(summary = "Get Workspace Admin Profile", description = "Decodes JWT Bearer token and returns authenticated Workspace Admin profile.")
    public ResponseEntity<ApiResponse<PlatformUserResponse>> getCurrentAdmin(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        PlatformUserResponse response = masterAuthService.getCurrentAdmin(authHeader);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PostMapping("/logout")
    @Operation(summary = "Logout Workspace Admin", description = "Revokes current JWT Token via Redis Blacklist and deletes refresh session.")
    public ResponseEntity<ApiResponse<Void>> logout(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody(required = false) com.smarthire.master.admin.dto.MasterLogoutRequest request
    ) {
        masterAuthService.logout(authHeader, request);
        return ResponseEntity.ok(ApiResponse.ok("Đăng xuất thành công", null));
    }

    @PostMapping("/change-password")
    @Operation(summary = "Change Password", description = "Allows authenticated Workspace Admin to update their password.")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @Valid @RequestBody com.smarthire.master.admin.dto.MasterChangePasswordRequest request
    ) {
        masterAuthService.changePassword(authHeader, request);
        return ResponseEntity.ok(ApiResponse.ok("Đổi mật khẩu thành công", null));
    }
}
