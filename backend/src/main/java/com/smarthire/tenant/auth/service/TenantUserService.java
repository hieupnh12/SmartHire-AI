package com.smarthire.tenant.auth.service;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.enums.UserRole;
import com.smarthire.domain.enums.UserStatus;
import com.smarthire.domain.tenant.entity.TenantRole;
import com.smarthire.domain.tenant.entity.User;
import com.smarthire.domain.tenant.repository.UserRepository;
import com.smarthire.tenant.auth.dto.CreateEmployeeRequest;
import com.smarthire.tenant.auth.dto.UserResponse;
import com.smarthire.tenant.auth.mapper.AuthMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class TenantUserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthMapper authMapper;
    private final TenantRoleService tenantRoleService;

    @Transactional
    public UserResponse createEmployee(CreateEmployeeRequest request) {
        if (userRepository.existsByEmailIgnoreCase(request.getEmail())) {
            throw new BusinessException("User with email '" + request.getEmail() + "' already exists in this Tenant.", HttpStatus.CONFLICT, "EMAIL_EXISTS");
        }

        TenantRole tenantRole = tenantRoleService.requireExisting(request.getRole());

        User user = new User();
        user.setEmail(request.getEmail().toLowerCase());
        user.setFullName(request.getFullName());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setRole(tenantRole.getCode());
        user.setStatus(UserStatus.ACTIVE);

        User savedUser = userRepository.save(user);
        return withWorkspace(authMapper.toUserResponse(savedUser));
    }

    @Transactional
    public UserResponse assignRole(Long userId, String roleCode) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("User not found", HttpStatus.NOT_FOUND, "USER_NOT_FOUND"));
        if (UserRole.isCandidate(user.getRole())) {
            throw new BusinessException("Cannot change a candidate account to a staff role",
                    HttpStatus.BAD_REQUEST, "USER_NOT_STAFF");
        }
        TenantRole tenantRole = tenantRoleService.requireAssignable(roleCode);
        user.setRole(tenantRole.getCode());
        return withWorkspace(authMapper.toUserResponse(userRepository.save(user)));
    }

    @Transactional(readOnly = true)
    public List<UserResponse> getEmployees() {
        return authMapper.toUserResponseList(userRepository.findAll()).stream()
                .filter(user -> !UserRole.isCandidate(user.getRole()))
                .map(this::withWorkspace)
                .toList();
    }

    private UserResponse withWorkspace(UserResponse response) {
        if (response != null) {
            response.setWorkspace(UserRole.workspaceOf(response.getRole()));
        }
        return response;
    }
}
