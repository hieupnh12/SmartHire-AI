package com.smarthire.domain.master.repository;

import com.smarthire.domain.master.entity.Contract;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ContractRepository extends JpaRepository<Contract, Long> {

    Optional<Contract> findByContractNumber(String contractNumber);

    Optional<Contract> findBySigningToken(String signingToken);

    List<Contract> findByTenantIdOrderByCreatedAtDesc(Long tenantId);

    List<Contract> findByStatusOrderByCreatedAtDesc(String status);

    List<Contract> findAllByOrderByCreatedAtDesc();

    long countByStatus(String status);
}
