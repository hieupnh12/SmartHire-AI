package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.tenant.entity.RolePermission;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RolePermissionRepository extends JpaRepository<RolePermission, Long> {
    List<RolePermission> findByRole(String role);

    List<RolePermission> findByRoleIn(Collection<String> roles);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("delete from RolePermission r where r.role = :role")
    void deleteByRole(@Param("role") String role);

    boolean existsByRoleAndFeatureCode(String role, String featureCode);
}
