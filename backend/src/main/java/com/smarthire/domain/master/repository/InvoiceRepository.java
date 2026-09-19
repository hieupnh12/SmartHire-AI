package com.smarthire.domain.master.repository;

import com.smarthire.domain.master.entity.Invoice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, Long> {
    List<Invoice> findByTenantIdOrderByCreatedAtDesc(Long tenantId);
    List<Invoice> findByStatus(String status);
}
