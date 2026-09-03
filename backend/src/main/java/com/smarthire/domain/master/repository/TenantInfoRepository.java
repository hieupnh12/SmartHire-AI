package com.smarthire.domain.master.repository;

import com.smarthire.domain.master.entity.TenantInfo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TenantInfoRepository extends JpaRepository<TenantInfo, Long> {
    Optional<TenantInfo> findByCode(String code);
    Optional<TenantInfo> findBySubdomain(String subdomain);
    boolean existsByCode(String code);
    boolean existsBySubdomain(String subdomain);
}
