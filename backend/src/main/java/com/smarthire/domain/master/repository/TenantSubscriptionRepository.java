package com.smarthire.domain.master.repository;

import com.smarthire.domain.master.entity.TenantSubscription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TenantSubscriptionRepository extends JpaRepository<TenantSubscription, Long> {
    Optional<TenantSubscription> findFirstByTenantIdAndStatusOrderByCreatedAtDesc(Long tenantId, String status);
    List<TenantSubscription> findByTenantIdOrderByCreatedAtDesc(Long tenantId);
}
