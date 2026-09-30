package com.smarthire.master.admin.service;

import com.smarthire.common.exception.BusinessException;
import org.springframework.http.HttpStatus;
import com.smarthire.domain.master.entity.PlatformUser;
import com.smarthire.domain.master.repository.PlatformUserRepository;
import com.smarthire.master.admin.dto.CreatePlatformUserRequest;
import com.smarthire.master.admin.dto.PlatformUserResponse;
import com.smarthire.master.admin.dto.UpdatePlatformUserRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class MasterAdminUserService {

    private final PlatformUserRepository platformUserRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public List<PlatformUserResponse> getAllAdminUsers() {
        return platformUserRepository.findAll().stream()
                .map(PlatformUserResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public PlatformUserResponse getAdminUserById(Long id) {
        PlatformUser user = platformUserRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Admin user not found with id: " + id, HttpStatus.NOT_FOUND, "USER_NOT_FOUND"));
        return PlatformUserResponse.fromEntity(user);
    }

    @Transactional
    public PlatformUserResponse createAdminUser(CreatePlatformUserRequest request) {
        if (platformUserRepository.existsByEmailIgnoreCase(request.getEmail())) {
            throw new BusinessException("Email already exists: " + request.getEmail(), HttpStatus.BAD_REQUEST, "EMAIL_EXISTS");
        }

        PlatformUser newUser = PlatformUser.builder()
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName())
                .role(request.getRole() != null ? request.getRole() : "WORKSPACE_ADMIN")
                .status("ACTIVE")
                .build();

        newUser = platformUserRepository.save(newUser);
        return PlatformUserResponse.fromEntity(newUser);
    }

    @Transactional
    public PlatformUserResponse updateAdminUser(Long id, UpdatePlatformUserRequest request) {
        PlatformUser user = platformUserRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Admin user not found with id: " + id, HttpStatus.NOT_FOUND, "USER_NOT_FOUND"));

        if (request.getFullName() != null && !request.getFullName().trim().isEmpty()) {
            user.setFullName(request.getFullName());
        }
        if (request.getRole() != null && !request.getRole().trim().isEmpty()) {
            user.setRole(request.getRole());
        }
        if (request.getStatus() != null && !request.getStatus().trim().isEmpty()) {
            user.setStatus(request.getStatus());
        }

        user = platformUserRepository.save(user);
        return PlatformUserResponse.fromEntity(user);
    }

    @Transactional
    public void deleteAdminUser(Long id) {
        if (!platformUserRepository.existsById(id)) {
            throw new BusinessException("Admin user not found with id: " + id, HttpStatus.NOT_FOUND, "USER_NOT_FOUND");
        }
        platformUserRepository.deleteById(id);
    }
}
