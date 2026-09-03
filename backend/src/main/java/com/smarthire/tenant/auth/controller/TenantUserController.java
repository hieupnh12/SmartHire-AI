package com.smarthire.tenant.auth.controller;

import com.smarthire.common.api.ApiResponse;
import com.smarthire.tenant.auth.dto.CreateEmployeeRequest;
import com.smarthire.tenant.auth.dto.UserResponse;
import com.smarthire.tenant.auth.service.TenantUserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/tenant/users")
@Tag(name = "Tenant User Management", description = "Employee Creation and Role Assignment APIs for Enterprise Tenants")
public class TenantUserController {

    private final TenantUserService tenantUserService;

    public TenantUserController(TenantUserService tenantUserService) {
        this.tenantUserService = tenantUserService;
    }

    @PostMapping
    @Operation(summary = "Create Employee & Assign Role", description = "Creates a new employee in the Tenant DB with a specified role (TENANT_ADMIN, HR, CANDIDATE).")
    public ResponseEntity<ApiResponse<UserResponse>> createEmployee(@Valid @RequestBody CreateEmployeeRequest request) {
        UserResponse response = tenantUserService.createEmployee(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Employee created and role assigned successfully", response));
    }

    @GetMapping
    @Operation(summary = "List Tenant Employees", description = "Returns a list of all users/employees registered in the current Tenant DB.")
    public ResponseEntity<ApiResponse<List<UserResponse>>> getEmployees() {
        List<UserResponse> employees = tenantUserService.getEmployees();
        return ResponseEntity.ok(ApiResponse.ok(employees));
    }
}
