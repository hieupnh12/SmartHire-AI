package com.smarthire.domain.master.repository;

import com.smarthire.domain.master.entity.PlatformAuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PlatformAuditLogRepository extends JpaRepository<PlatformAuditLog, Long> {
    List<PlatformAuditLog> findTop50ByOrderByCreatedAtDesc();
    Page<PlatformAuditLog> findByTenantCodeOrderByCreatedAtDesc(String tenantCode, Pageable pageable);
    Page<PlatformAuditLog> findByActionOrderByCreatedAtDesc(String action, Pageable pageable);
}
