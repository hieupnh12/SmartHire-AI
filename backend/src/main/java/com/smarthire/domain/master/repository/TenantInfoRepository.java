package com.smarthire.domain.master.repository;

import com.smarthire.domain.master.entity.TenantInfo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TenantInfoRepository extends JpaRepository<TenantInfo, Long> {
    @org.springframework.transaction.annotation.Transactional(transactionManager = "masterTransactionManager")
    @org.springframework.data.jpa.repository.Modifying(clearAutomatically = true)
    @org.springframework.data.jpa.repository.Query("update TenantInfo t set t.status = :status, t.updatedAt = CURRENT_TIMESTAMP where t.id = :id and t.status in ('ACTIVE', 'SUSPENDED')")
    int changeOperationalStatus(@org.springframework.data.repository.query.Param("id") Long id,
                                @org.springframework.data.repository.query.Param("status") String status);
    Optional<TenantInfo> findByCode(String code);
    Optional<TenantInfo> findBySubdomain(String subdomain);
    boolean existsByCode(String code);
    boolean existsBySubdomain(String subdomain);
    long countByStatus(String status);
    List<TenantInfo> findByStatus(String status);
}
