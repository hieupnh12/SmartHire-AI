package com.smarthire.domain.master.repository;

import com.smarthire.domain.master.entity.TenantUsageDaily;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface TenantUsageDailyRepository extends JpaRepository<TenantUsageDaily, Long> {

    Optional<TenantUsageDaily> findByTenantIdAndUsageDate(Long tenantId, LocalDate usageDate);

    List<TenantUsageDaily> findByTenantIdAndUsageDateBetweenOrderByUsageDateAsc(
            Long tenantId, LocalDate startDate, LocalDate endDate);

    @Query("SELECT COALESCE(SUM(u.cvParsesCount), 0) FROM TenantUsageDaily u WHERE u.tenantId = :tenantId AND u.usageDate BETWEEN :startDate AND :endDate")
    long sumCvParsesForPeriod(@Param("tenantId") Long tenantId, @Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    @Query("SELECT COALESCE(SUM(u.aiVoiceSeconds), 0) FROM TenantUsageDaily u WHERE u.tenantId = :tenantId AND u.usageDate BETWEEN :startDate AND :endDate")
    long sumAiVoiceSecondsForPeriod(@Param("tenantId") Long tenantId, @Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);
}
