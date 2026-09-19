package com.smarthire.tenant.auth.service;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.enums.RecruiterFeature;
import com.smarthire.domain.enums.UserRole;
import com.smarthire.domain.tenant.entity.RolePermission;
import com.smarthire.domain.tenant.repository.RolePermissionRepository;
import com.smarthire.tenant.auth.dto.RolePermissionsResponse;
import com.smarthire.tenant.auth.dto.UpdateRolePermissionsRequest;
import jakarta.persistence.EntityManager;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RolePermissionService {

    static final List<String> DEFAULT_ASSIGNABLE_ROLES = List.of(UserRole.HR.name(), UserRole.RECRUITER.name());

    private static final String CREATE_TABLE_SQL = """
            CREATE TABLE IF NOT EXISTS role_permissions (
                id           BIGINT PRIMARY KEY AUTO_INCREMENT,
                `role`       VARCHAR(64)  NOT NULL,
                feature_code VARCHAR(64)  NOT NULL,
                created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY uk_role_permissions_role_feature (`role`, feature_code)
            )
            """;

    private final RolePermissionRepository rolePermissionRepository;
    private final EntityManager entityManager;

    public RolePermissionService(RolePermissionRepository rolePermissionRepository, EntityManager entityManager) {
        this.rolePermissionRepository = rolePermissionRepository;
        this.entityManager = entityManager;
    }

    @Transactional
    public RolePermissionsResponse getMatrix() {
        ensureSchema();
        return loadMatrix();
    }

    @Transactional
    public RolePermissionsResponse replace(UpdateRolePermissionsRequest request) {
        if (request.getGrants() == null) {
            throw new BusinessException("grants is required", HttpStatus.BAD_REQUEST, "INVALID_GRANTS");
        }
        ensureSchema();
        for (Map.Entry<String, List<String>> entry : request.getGrants().entrySet()) {
            replaceFeatures(parseAssignableRole(entry.getKey()), entry.getValue());
        }
        return loadMatrix();
    }

    @Transactional
    public void replaceFeatures(String roleCode, List<String> rawFeatures) {
        String role = parseAssignableRole(roleCode);
        List<String> features = normalizeFeatures(rawFeatures);
        rolePermissionRepository.deleteByRole(role);
        rolePermissionRepository.flush();
        for (String featureCode : features) {
            RolePermission row = new RolePermission();
            row.setRole(role);
            row.setFeatureCode(featureCode);
            rolePermissionRepository.save(row);
        }
        rolePermissionRepository.flush();
    }

    @Transactional
    public void deleteFeatures(String roleCode) {
        if (roleCode == null || roleCode.isBlank()) {
            return;
        }
        rolePermissionRepository.deleteByRole(roleCode.trim().toUpperCase(Locale.ROOT));
        rolePermissionRepository.flush();
    }

    @Transactional
    public List<String> permissionsFor(UserRole role) {
        return permissionsFor(role == null ? null : role.name());
    }

    @Transactional
    public List<String> permissionsFor(String role) {
        if (role == null || role.isBlank()) {
            return List.of();
        }
        if (UserRole.isCompanyAdmin(role)) {
            return RecruiterFeature.codes();
        }
        if (!UserRole.isRecruiterStaff(role)) {
            return List.of();
        }
        return rolePermissionRepository.findByRole(role).stream()
                .map(RolePermission::getFeatureCode)
                .toList();
    }

    @Transactional
    public boolean hasFeature(UserRole role, RecruiterFeature feature) {
        return hasFeature(role == null ? null : role.name(), feature);
    }

    @Transactional
    public boolean hasFeature(String role, RecruiterFeature feature) {
        if (role == null || feature == null) {
            return false;
        }
        if (UserRole.isCompanyAdmin(role)) {
            return true;
        }
        if (!UserRole.isRecruiterStaff(role)) {
            return true;
        }
        return rolePermissionRepository.existsByRoleAndFeatureCode(role, feature.name());
    }

    public void ensureSchema() {
        if (!tableExists()) {
            entityManager.createNativeQuery(CREATE_TABLE_SQL).executeUpdate();
            entityManager.flush();
        }
        if (rolePermissionRepository.count() > 0) {
            return;
        }
        for (String role : DEFAULT_ASSIGNABLE_ROLES) {
            for (String code : RecruiterFeature.codes()) {
                RolePermission row = new RolePermission();
                row.setRole(role);
                row.setFeatureCode(code);
                rolePermissionRepository.save(row);
            }
        }
        rolePermissionRepository.flush();
    }

    private RolePermissionsResponse loadMatrix() {
        Set<String> roles = new LinkedHashSet<>(DEFAULT_ASSIGNABLE_ROLES);
        Map<String, List<String>> grants = new LinkedHashMap<>();
        for (RolePermission row : rolePermissionRepository.findAll()) {
            if (!UserRole.isRecruiterStaff(row.getRole())) {
                continue;
            }
            roles.add(row.getRole());
            grants.computeIfAbsent(row.getRole(), key -> new ArrayList<>()).add(row.getFeatureCode());
        }
        Map<String, List<String>> named = new LinkedHashMap<>();
        for (String role : roles) {
            named.put(role, grants.getOrDefault(role, new ArrayList<>()));
        }
        return RolePermissionsResponse.builder()
                .assignableRoles(List.copyOf(roles))
                .features(RecruiterFeature.codes())
                .grants(named)
                .build();
    }

    private boolean tableExists() {
        Number count = (Number) entityManager.createNativeQuery(
                        "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'role_permissions'")
                .getSingleResult();
        return count != null && count.longValue() > 0;
    }

    private static String parseAssignableRole(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new BusinessException("Role is required", HttpStatus.BAD_REQUEST, "INVALID_ROLE");
        }
        String role = raw.trim().toUpperCase(Locale.ROOT);
        if (!UserRole.isRecruiterStaff(role)) {
            throw new BusinessException("Role cannot be assigned features: " + role,
                    HttpStatus.BAD_REQUEST, "ROLE_NOT_ASSIGNABLE");
        }
        return role;
    }

    private static List<String> normalizeFeatures(List<String> raw) {
        if (raw == null || raw.isEmpty()) {
            return List.of();
        }
        List<String> codes = new ArrayList<>();
        for (String item : raw) {
            RecruiterFeature feature = RecruiterFeature.fromCode(item);
            if (feature == null) {
                throw new BusinessException("Unknown feature: " + item, HttpStatus.BAD_REQUEST, "INVALID_FEATURE");
            }
            if (!codes.contains(feature.name())) {
                codes.add(feature.name());
            }
        }
        return codes;
    }
}
