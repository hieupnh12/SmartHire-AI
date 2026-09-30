package com.smarthire.domain.master.repository;

import com.smarthire.domain.master.entity.PaymentTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentTransactionRepository extends JpaRepository<PaymentTransaction, Long> {

    List<PaymentTransaction> findByInvoiceIdOrderByCreatedAtDesc(Long invoiceId);

    List<PaymentTransaction> findByTxnRefOrderByCreatedAtDesc(String txnRef);

    Optional<PaymentTransaction> findByTransactionNo(String transactionNo);
}
