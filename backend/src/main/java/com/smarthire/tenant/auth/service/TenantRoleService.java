package com.smarthire.tenant.auth.service;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.enums.InvitationStatus;
import com.smarthire.domain.enums.RecruiterFeature;
import com.smarthire.domain.enums.RoleWorkspace;
import com.smarthire.domain.enums.UserRole;
import com.smarthire.domain.tenant.entity.TenantRole;
import com.smarthire.domain.tenant.repository.MemberInvitationRepository;
import com.smarthire.domain.tenant.repository.TenantRoleRepository;
import com.smarthire.domain.tenant.repository.UserRepository;
import com.smarthire.tenant.auth.dto.CreateTenantRoleRequest;
import com.smarthire.tenant.auth.dto.TenantRoleCatalogResponse;
import com.smarthire.tenant.auth.dto.TenantRoleResponse;
import com.smarthire.tenant.auth.dto.UpdateTenantRoleRequest;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TenantRoleService {

    private static final Set<String> RESERVED_CODES = Set.of(
            UserRole.TENANT_ADMIN.name(),
            UserRole.ADMIN.name(),
            UserRole.HR.name(),
            UserRole.RECRUITER.name(),
            UserRole.CANDIDATE.name(),
            "STAFF",
            "WORKSPACE_ADMIN");

    private final TenantRoleRepository tenantRoleRepository;
    private final RolePermissionService rolePermissionService;
    private final UserRepository userRepository;
    private final MemberInvitationRepository invitationRepository;

    public TenantRoleService(
            TenantRoleRepository tenantRoleRepository,
            RolePermissionService rolePermissionService,
            UserRepository userRepository,
            MemberInvitationRepository invitationRepository) {
        this.tenantRoleRepository = tenantRoleRepository;
        this.rolePermissionService = rolePermissionService;
        this.userRepository = userRepository;
        this.invitationRepository = invitationRepository;
    }

    @Transactional(readOnly = true)
    public TenantRoleCatalogResponse list() {
        List<TenantRoleResponse> roles = tenantRoleRepository.findAll().stream()
                .sorted(Comparator.comparing(TenantRole::isSystem).reversed()
                        .thenComparing(TenantRole::getName, String.CASE_INSENSITIVE_ORDER))
                .map(this::toResponse)
                .toList();
        return TenantRoleCatalogResponse.builder()
                .features(RecruiterFeature.codes())
                .roles(roles)
                .build();
    }

    @Transactional
    public TenantRoleResponse create(CreateTenantRoleRequest request) {
        String name = normalizeName(request.getName());
        String code = uniqueCode(name);
        TenantRole role = new TenantRole();
        role.setCode(code);
        role.setName(name);
        role.setWorkspace(RoleWorkspace.RECRUITER);
        role.setSystem(false);
        TenantRole saved = tenantRoleRepository.save(role);
        rolePermissionService.replaceFeatures(saved.getCode(), request.getFeatures());
        return toResponse(saved);
    }

    @Transactional
    public TenantRoleResponse update(Long id, UpdateTenantRoleRequest request) {
        TenantRole role = tenantRoleRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Role not found", HttpStatus.NOT_FOUND, "ROLE_NOT_FOUND"));
        if (role.getWorkspace() != RoleWorkspace.RECRUITER) {
            throw new BusinessException("Only recruiter workspace roles can be assigned features",
                    HttpStatus.BAD_REQUEST, "ROLE_NOT_ASSIGNABLE");
        }
        if (request.getName() != null && !request.getName().isBlank()) {
            if (role.isSystem()) {
                throw new BusinessException("System role name cannot be changed", HttpStatus.BAD_REQUEST, "ROLE_SYSTEM");
            }
            role.setName(normalizeName(request.getName()));
        }
        if (request.getFeatures() != null) {
            rolePermissionService.replaceFeatures(role.getCode(), request.getFeatures());
        }
        return toResponse(tenantRoleRepository.save(role));
    }

    @Transactional
    public void delete(Long id) {
        TenantRole role = tenantRoleRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Role not found", HttpStatus.NOT_FOUND, "ROLE_NOT_FOUND"));
        if (isProtected(role)) {
            throw new BusinessException("Default and admin roles cannot be deleted", HttpStatus.BAD_REQUEST, "ROLE_PROTECTED");
        }
        if (userRepository.existsByRole(role.getCode())) {
            throw new BusinessException("Role is assigned to users", HttpStatus.CONFLICT, "ROLE_IN_USE");
        }
        if (invitationRepository.existsByRoleAndStatus(role.getCode(), InvitationStatus.PENDING)) {
            throw new BusinessException("Role is used by a pending invitation", HttpStatus.CONFLICT, "ROLE_IN_USE");
        }
        rolePermissionService.deleteFeatures(role.getCode());
        tenantRoleRepository.delete(role);
    }

    @Transactional(readOnly = true)
    public TenantRole requireAssignable(String rawCode) {
        if (rawCode == null || rawCode.isBlank()) {
            throw new BusinessException("Role is required", HttpStatus.BAD_REQUEST, "INVALID_ROLE");
        }
        String code = rawCode.trim().toUpperCase(Locale.ROOT);
        TenantRole role = tenantRoleRepository.findByCode(code)
                .orElseThrow(() -> new BusinessException("Unknown role: " + code, HttpStatus.BAD_REQUEST, "INVALID_ROLE"));
        if (role.getWorkspace() == RoleWorkspace.CANDIDATE) {
            throw new BusinessException("Candidates cannot be invited as staff",
                    HttpStatus.BAD_REQUEST, "INVALID_ROLE");
        }
        return role;
    }

    @Transactional(readOnly = true)
    public TenantRole requireExisting(String rawCode) {
        if (rawCode == null || rawCode.isBlank()) {
            throw new BusinessException("Role is required", HttpStatus.BAD_REQUEST, "INVALID_ROLE");
        }
        String code = rawCode.trim().toUpperCase(Locale.ROOT);
        return tenantRoleRepository.findByCode(code)
                .orElseThrow(() -> new BusinessException("Unknown role: " + code, HttpStatus.BAD_REQUEST, "INVALID_ROLE"));
    }

    private TenantRoleResponse toResponse(TenantRole role) {
        boolean assignable = role.getWorkspace() == RoleWorkspace.RECRUITER;
        List<String> features = assignable
                ? rolePermissionService.permissionsFor(role.getCode())
                : List.of();
        return TenantRoleResponse.builder()
                .id(role.getId())
                .code(role.getCode())
                .name(role.getName())
                .workspace(role.getWorkspace().name())
                .system(role.isSystem())
                .assignable(assignable)
                .features(features)
                .build();
    }

    private String uniqueCode(String name) {
        String slug = name.toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9]+", "_").replaceAll("^_+|_+$", "");
        if (slug.isBlank()) {
            slug = "ROLE";
        }
        if (slug.length() > 48) {
            slug = slug.substring(0, 48);
        }
        String candidate = slug;
        int suffix = 2;
        while (RESERVED_CODES.contains(candidate) || tenantRoleRepository.existsByCode(candidate)) {
            String next = slug + "_" + suffix;
            if (next.length() > 64) {
                next = next.substring(0, 64);
            }
            candidate = next;
            suffix++;
        }
        return candidate;
    }

    private static String normalizeName(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new BusinessException("Role name is required", HttpStatus.BAD_REQUEST, "INVALID_ROLE");
        }
        return raw.trim();
    }

    static boolean isProtected(TenantRole role) {
        if (role == null) {
            return true;
        }
        if (role.isSystem()) {
            return true;
        }
        if (role.getWorkspace() == RoleWorkspace.ADMIN || role.getWorkspace() == RoleWorkspace.CANDIDATE) {
            return true;
        }
        return role.getCode() != null && RESERVED_CODES.contains(role.getCode());
    }
}
