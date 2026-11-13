package com.smarthire.domain.master.repository;

import com.smarthire.domain.master.entity.TenantSystemLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TenantSystemLogRepository extends JpaRepository<TenantSystemLog, Long> {

    List<TenantSystemLog> findTop100ByOrderByCreatedAtDesc();

    List<TenantSystemLog> findTop100ByTenantCodeOrderByCreatedAtDesc(String tenantCode);

    List<TenantSystemLog> findTop100ByLevelOrderByCreatedAtDesc(String level);

    List<TenantSystemLog> findTop100ByTenantCodeAndLevelOrderByCreatedAtDesc(String tenantCode, String level);

    Page<TenantSystemLog> findByTenantCodeOrderByCreatedAtDesc(String tenantCode, Pageable pageable);

    Page<TenantSystemLog> findByLevelOrderByCreatedAtDesc(String level, Pageable pageable);

    Page<TenantSystemLog> findByTenantCodeAndLevelOrderByCreatedAtDesc(String tenantCode, String level, Pageable pageable);
}
