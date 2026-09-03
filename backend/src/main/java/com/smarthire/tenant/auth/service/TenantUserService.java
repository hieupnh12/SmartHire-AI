package com.smarthire.tenant.auth.service;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.enums.UserRole;
import com.smarthire.domain.enums.UserStatus;
import com.smarthire.domain.tenant.entity.User;
import com.smarthire.domain.tenant.repository.UserRepository;
import com.smarthire.tenant.auth.dto.CreateEmployeeRequest;
import com.smarthire.tenant.auth.dto.UserResponse;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class TenantUserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public TenantUserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public UserResponse createEmployee(CreateEmployeeRequest request) {
        if (userRepository.existsByEmailIgnoreCase(request.getEmail())) {
            throw new BusinessException("User with email '" + request.getEmail() + "' already exists in this Tenant.", HttpStatus.CONFLICT, "EMAIL_EXISTS");
        }

        UserRole userRole;
        try {
            userRole = UserRole.valueOf(request.getRole().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BusinessException("Invalid role specified. Supported roles: TENANT_ADMIN, ADMIN, HR, RECRUITER, CANDIDATE", HttpStatus.BAD_REQUEST, "INVALID_ROLE");
        }

        User user = new User();
        user.setEmail(request.getEmail().toLowerCase());
        user.setFullName(request.getFullName());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setRole(userRole);
        user.setStatus(UserStatus.ACTIVE);

        User savedUser = userRepository.save(user);
        return UserResponse.fromEntity(savedUser);
    }

    @Transactional(readOnly = true)
    public List<UserResponse> getEmployees() {
        return userRepository.findAll().stream()
                .map(UserResponse::fromEntity)
                .collect(Collectors.toList());
    }
}
