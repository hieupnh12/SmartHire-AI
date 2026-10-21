package com.smarthire.domain.master.repository;

import com.smarthire.domain.master.entity.Invoice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, Long> {
    List<Invoice> findAllByOrderByCreatedAtDesc();
    List<Invoice> findByTenantIdOrderByCreatedAtDesc(Long tenantId);
    List<Invoice> findByStatusOrderByCreatedAtDesc(String status);
    Optional<Invoice> findByInvoiceNumber(String invoiceNumber);
    List<Invoice> findByStatusAndPaidAtBetweenOrderByPaidAtAsc(String status, java.time.LocalDateTime start, java.time.LocalDateTime end);

    @org.springframework.data.jpa.repository.Query("SELECT i FROM Invoice i WHERE i.status = 'PENDING' AND ((i.dueDate IS NOT NULL AND i.dueDate < :now) OR (i.dueDate IS NULL AND i.createdAt < :cutoff))")
    List<Invoice> findExpiredPendingInvoices(
            @org.springframework.data.repository.query.Param("now") java.time.LocalDateTime now,
            @org.springframework.data.repository.query.Param("cutoff") java.time.LocalDateTime cutoff
    );
}
