package com.smarthire.domain.master.repository;

import com.smarthire.domain.master.entity.ContractSignature;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ContractSignatureRepository extends JpaRepository<ContractSignature, Long> {
    List<ContractSignature> findByContractId(Long contractId);
    Optional<ContractSignature> findByContractIdAndStatus(Long contractId, String status);
}
