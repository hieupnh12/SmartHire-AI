package com.smarthire.domain.master.repository;

import com.smarthire.domain.master.entity.TenantAiUsageDaily;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TenantAiUsageDailyRepository extends JpaRepository<TenantAiUsageDaily, Long> {
    Optional<TenantAiUsageDaily> findByTenantIdAndUsageDateAndTaskTypeAndProviderAndModelName(
            Long tenantId, LocalDate usageDate, String taskType, String provider, String modelName);

    List<TenantAiUsageDaily> findByUsageDateBetweenOrderByUsageDateAsc(LocalDate startDate, LocalDate endDate);

    List<TenantAiUsageDaily> findByTenantIdAndUsageDateBetweenOrderByUsageDateAsc(
            Long tenantId, LocalDate startDate, LocalDate endDate);
}
