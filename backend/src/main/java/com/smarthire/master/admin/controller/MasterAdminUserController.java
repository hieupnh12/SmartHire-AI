package com.smarthire.master.admin.controller;

import com.smarthire.common.api.ApiResponse;
import com.smarthire.master.admin.dto.CreatePlatformUserRequest;
import com.smarthire.master.admin.dto.PlatformUserResponse;
import com.smarthire.master.admin.dto.UpdatePlatformUserRequest;
import com.smarthire.master.admin.service.MasterAdminUserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/master/admin/users")
@RequiredArgsConstructor
@Tag(name = "Master - Admin User Management", description = "CRUD for Platform Users (Landlord Admins)")
public class MasterAdminUserController {

    private final MasterAdminUserService masterAdminUserService;

    @GetMapping
    @Operation(summary = "Get all platform admin users")
    public ApiResponse<List<PlatformUserResponse>> getAllAdminUsers() {
        return ApiResponse.ok(masterAdminUserService.getAllAdminUsers());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get platform admin user by ID")
    public ApiResponse<PlatformUserResponse> getAdminUserById(@PathVariable Long id) {
        return ApiResponse.ok(masterAdminUserService.getAdminUserById(id));
    }

    @PostMapping
    @Operation(summary = "Create a new platform admin user")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<PlatformUserResponse> createAdminUser(@RequestBody @Valid CreatePlatformUserRequest request) {
        return ApiResponse.ok(masterAdminUserService.createAdminUser(request));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update platform admin user details")
    public ApiResponse<PlatformUserResponse> updateAdminUser(@PathVariable Long id, @RequestBody @Valid UpdatePlatformUserRequest request) {
        return ApiResponse.ok(masterAdminUserService.updateAdminUser(id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a platform admin user")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public ApiResponse<Void> deleteAdminUser(@PathVariable Long id) {
        masterAdminUserService.deleteAdminUser(id);
        return ApiResponse.ok(null);
    }
}
