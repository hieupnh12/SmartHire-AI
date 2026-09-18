package com.smarthire.domain.master.repository;

import com.smarthire.domain.master.entity.ConsultationRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ConsultationRequestRepository extends JpaRepository<ConsultationRequest, Long> {

    List<ConsultationRequest> findAllByOrderByCreatedAtDesc();

    List<ConsultationRequest> findByStatusOrderByCreatedAtDesc(String status);

    List<ConsultationRequest> findByRequestTypeOrderByCreatedAtDesc(String requestType);

    long countByStatus(String status);
}
