package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.tenant.entity.TenantRole;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TenantRoleRepository extends JpaRepository<TenantRole, Long> {
    Optional<TenantRole> findByCode(String code);

    boolean existsByCode(String code);
}
