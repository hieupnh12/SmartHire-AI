package com.smarthire.domain.master.repository;

import com.smarthire.domain.master.entity.Invoice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, Long> {
    List<Invoice> findAllByOrderByCreatedAtDesc();
    List<Invoice> findByTenantIdOrderByCreatedAtDesc(Long tenantId);
    List<Invoice> findByTenantIdInOrderByCreatedAtDesc(List<Long> tenantIds);
    List<Invoice> findByStatusOrderByCreatedAtDesc(String status);
    Optional<Invoice> findByInvoiceNumber(String invoiceNumber);
    List<Invoice> findByStatusAndPaidAtBetweenOrderByPaidAtAsc(String status, LocalDateTime start, LocalDateTime end);

    @Query("SELECT i FROM Invoice i WHERE i.status = 'PENDING' AND ((i.dueDate IS NOT NULL AND i.dueDate < :now) OR (i.dueDate IS NULL AND i.createdAt < :cutoff))")
    List<Invoice> findExpiredPendingInvoices(
            @Param("now") LocalDateTime now,
            @Param("cutoff") LocalDateTime cutoff
    );
}
