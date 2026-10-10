package com.smarthire.domain.master.repository;

import com.smarthire.domain.master.entity.TenantSubscription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface TenantSubscriptionRepository extends JpaRepository<TenantSubscription, Long> {
    Optional<TenantSubscription> findFirstByTenantIdAndStatusOrderByCreatedAtDesc(Long tenantId, String status);
    Optional<TenantSubscription> findFirstByTenantIdAndStatusInOrderByCreatedAtDesc(Long tenantId, Collection<String> statuses);
    List<TenantSubscription> findByTenantIdOrderByCreatedAtDesc(Long tenantId);
    boolean existsByPlanId(Long planId);
    long countByPlanId(Long planId);
    List<TenantSubscription> findByStatusInAndEndsAtBefore(Collection<String> statuses, LocalDateTime cutoff);
    List<TenantSubscription> findByStatusAndGracePeriodEndsAtBefore(String status, LocalDateTime cutoff);
}
