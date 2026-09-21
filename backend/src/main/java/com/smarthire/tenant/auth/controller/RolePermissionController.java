package com.smarthire.tenant.auth.controller;

import com.smarthire.common.api.ApiResponse;
import com.smarthire.tenant.auth.dto.RolePermissionsResponse;
import com.smarthire.tenant.auth.dto.UpdateRolePermissionsRequest;
import com.smarthire.tenant.auth.service.RolePermissionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/tenant/role-permissions")
@Tag(name = "Tenant Role Permissions", description = "Company admin assigns recruiter workspace features to HR and RECRUITER")
public class RolePermissionController {

    private final RolePermissionService rolePermissionService;

    public RolePermissionController(RolePermissionService rolePermissionService) {
        this.rolePermissionService = rolePermissionService;
    }

    @GetMapping
    @Operation(summary = "Get role-feature matrix", description = "Returns assignable staff roles and the recruiter features granted to each.")
    public ResponseEntity<ApiResponse<RolePermissionsResponse>> getMatrix() {
        return ResponseEntity.ok(ApiResponse.ok(rolePermissionService.getMatrix()));
    }

    @PutMapping
    @Operation(summary = "Replace role-feature grants", description = "Replaces features for each role present in the body. TENANT_ADMIN cannot be restricted.")
    public ResponseEntity<ApiResponse<RolePermissionsResponse>> replace(
            @Valid @RequestBody UpdateRolePermissionsRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Role permissions updated", rolePermissionService.replace(request)));
    }
}
