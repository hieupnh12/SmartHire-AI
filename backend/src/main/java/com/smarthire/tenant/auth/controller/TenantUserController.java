package com.smarthire.tenant.auth.controller;

import com.smarthire.common.api.ApiResponse;
import com.smarthire.tenant.auth.dto.AcceptInvitationRequest;
import com.smarthire.tenant.auth.dto.CreateEmployeeRequest;
import com.smarthire.tenant.auth.dto.InviteMemberRequest;
import com.smarthire.tenant.auth.dto.InviteMemberResponse;
import com.smarthire.tenant.auth.dto.UpdateUserRoleRequest;
import com.smarthire.tenant.auth.dto.UserResponse;
import com.smarthire.tenant.auth.service.MemberInvitationService;
import com.smarthire.tenant.auth.service.TenantUserService;
import com.smarthire.tenant.job.dto.JobAssignmentModels.StaffAssignmentResponse;
import com.smarthire.tenant.job.service.JobAssignmentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/tenant/users")
@RequiredArgsConstructor
@Tag(name = "Tenant User Management", description = "Employee Creation and Role Assignment APIs for Enterprise Tenants")
public class TenantUserController {

    private final TenantUserService tenantUserService;
    private final MemberInvitationService memberInvitationService;
    private final JobAssignmentService jobAssignmentService;

    @PostMapping
    @Operation(summary = "Create Employee & Assign Role", description = "Creates a new employee in the Tenant DB with a specified role (TENANT_ADMIN, HR, CANDIDATE).")
    public ResponseEntity<ApiResponse<UserResponse>> createEmployee(@Valid @RequestBody CreateEmployeeRequest request) {
        UserResponse response = tenantUserService.createEmployee(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Employee created and role assigned successfully", response));
    }

    @GetMapping
    @Operation(summary = "List Tenant Employees", description = "Returns staff users in the current tenant. Candidate accounts are excluded.")
    public ResponseEntity<ApiResponse<List<UserResponse>>> getEmployees() {
        List<UserResponse> employees = tenantUserService.getEmployees();
        return ResponseEntity.ok(ApiResponse.ok(employees));
    }

    @GetMapping("/{id}/assignments")
    @Operation(summary = "Jobs assigned to a staff member")
    public ResponseEntity<ApiResponse<List<StaffAssignmentResponse>>> assignments(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(jobAssignmentService.listForUser(id)));
    }

    @PutMapping("/{id}/role")
    @Operation(summary = "Assign a staff role", description = "Updates the role of an existing staff user. Candidates cannot be converted here.")
    public ResponseEntity<ApiResponse<UserResponse>> assignRole(
            @PathVariable Long id,
            @Valid @RequestBody UpdateUserRoleRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Role assigned", tenantUserService.assignRole(id, request.getRole())));
    }

    @PostMapping("/invitations")
    @Operation(summary = "Invite a staff member", description = "Creates a pending invitation and emails a password-setup link. Roles: TENANT_ADMIN, ADMIN, HR, RECRUITER.")
    public ResponseEntity<ApiResponse<InviteMemberResponse>> inviteMember(@Valid @RequestBody InviteMemberRequest request) {
        InviteMemberResponse response = memberInvitationService.invite(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Invitation created", response));
    }

    @PostMapping("/invitations/accept")
    @Operation(summary = "Accept a staff invitation", description = "Sets the invitee's password and activates the account.")
    public ResponseEntity<ApiResponse<UserResponse>> acceptInvitation(@Valid @RequestBody AcceptInvitationRequest request) {
        UserResponse response = memberInvitationService.accept(request);
        return ResponseEntity.ok(ApiResponse.ok("Account activated", response));
    }
}
