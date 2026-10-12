package com.smarthire.domain.master.repository;

import com.smarthire.domain.master.entity.MasterConsentLog;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MasterConsentLogRepository extends JpaRepository<MasterConsentLog, Long> {
    List<MasterConsentLog> findByInvoiceIdOrderByCreatedAtDesc(Long invoiceId);

    List<MasterConsentLog> findByTenantIdOrderByCreatedAtDesc(Long tenantId);
}
