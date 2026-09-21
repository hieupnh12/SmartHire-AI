package com.smarthire.tenant.auth.controller;

import com.smarthire.common.api.ApiResponse;
import com.smarthire.tenant.auth.dto.CreateTenantRoleRequest;
import com.smarthire.tenant.auth.dto.TenantRoleCatalogResponse;
import com.smarthire.tenant.auth.dto.TenantRoleResponse;
import com.smarthire.tenant.auth.dto.UpdateTenantRoleRequest;
import com.smarthire.tenant.auth.service.TenantRoleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/tenant/roles")
@Tag(name = "Tenant Roles", description = "Company admin creates recruiter workspace roles and assigns features")
public class TenantRoleController {

    private final TenantRoleService tenantRoleService;

    public TenantRoleController(TenantRoleService tenantRoleService) {
        this.tenantRoleService = tenantRoleService;
    }

    @GetMapping
    @Operation(summary = "List tenant roles", description = "Returns system and custom roles plus the recruiter feature catalog.")
    public ResponseEntity<ApiResponse<TenantRoleCatalogResponse>> list() {
        return ResponseEntity.ok(ApiResponse.ok(tenantRoleService.list()));
    }

    @PostMapping
    @Operation(summary = "Create a recruiter role", description = "Creates a custom recruiter-workspace role and ticks granted features.")
    public ResponseEntity<ApiResponse<TenantRoleResponse>> create(@Valid @RequestBody CreateTenantRoleRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Role created", tenantRoleService.create(request)));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update a recruiter role", description = "Updates display name (custom roles) and/or feature grants.")
    public ResponseEntity<ApiResponse<TenantRoleResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateTenantRoleRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Role updated", tenantRoleService.update(id, request)));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a custom role", description = "Deletes an unused custom role. Default, admin, and candidate roles cannot be deleted.")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        tenantRoleService.delete(id);
        return ResponseEntity.ok(ApiResponse.ok("Role deleted", null));
    }
}
