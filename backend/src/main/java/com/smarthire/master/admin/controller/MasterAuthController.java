package com.smarthire.master.admin.controller;

import com.smarthire.common.api.ApiResponse;
import com.smarthire.master.admin.dto.MasterLoginRequest;
import com.smarthire.master.admin.dto.MasterLoginResponse;
import com.smarthire.master.admin.dto.PlatformUserResponse;
import com.smarthire.master.admin.service.MasterAuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/master/auth")
@Tag(name = "Platform Administration Auth", description = "Login and Profile APIs for SaaS Platform Super Admins")
public class MasterAuthController {

    private final MasterAuthService masterAuthService;

    public MasterAuthController(MasterAuthService masterAuthService) {
        this.masterAuthService = masterAuthService;
    }

    @PostMapping("/login")
    @Operation(summary = "Login Platform Super Admin", description = "Authenticates SaaS Platform Super Admin against Master DB and issues signed JWT Token.")
    public ResponseEntity<ApiResponse<MasterLoginResponse>> login(@Valid @RequestBody MasterLoginRequest request) {
        MasterLoginResponse response = masterAuthService.login(request);
        return ResponseEntity.ok(ApiResponse.ok("Super Admin login successful", response));
    }

    @GetMapping("/me")
    @Operation(summary = "Get Super Admin Profile", description = "Decodes JWT Bearer token and returns authenticated Super Admin profile.")
    public ResponseEntity<ApiResponse<PlatformUserResponse>> getCurrentAdmin(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        PlatformUserResponse response = masterAuthService.getCurrentAdmin(authHeader);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }
}
