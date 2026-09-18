package com.smarthire.master.lead.service;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.master.entity.ConsultationRequest;
import com.smarthire.domain.master.repository.ConsultationRequestRepository;
import com.smarthire.master.lead.dto.CreateConsultationRequest;
import com.smarthire.master.lead.dto.ConsultationResponse;
import com.smarthire.master.lead.dto.UpdateConsultationStatusRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class ConsultationRequestService {

    private static final Set<String> VALID_STATUSES = Set.of("PENDING", "CONTACTED", "PROVISIONED", "REJECTED");

    private final ConsultationRequestRepository repository;

    @Transactional(transactionManager = "masterTransactionManager")
    public ConsultationResponse createRequest(CreateConsultationRequest request) {
        String reqType = StringUtils.hasText(request.getRequestType()) ? request.getRequestType().toUpperCase() : "DEMO";
        if (!"DEMO".equals(reqType) && !"CONTRACT_QUOTE".equals(reqType)) {
            reqType = "DEMO";
        }

        ConsultationRequest entity = ConsultationRequest.builder()
                .companyName(request.getCompanyName().trim())
                .contactName(request.getContactName().trim())
                .jobTitle(request.getJobTitle() != null ? request.getJobTitle().trim() : null)
                .workEmail(request.getWorkEmail().trim().toLowerCase())
                .phoneNumber(request.getPhoneNumber() != null ? request.getPhoneNumber().trim() : null)
                .companySize(request.getCompanySize())
                .requestType(reqType)
                .planTier(request.getPlanTier())
                .primaryNeed(request.getPrimaryNeed())
                .notes(request.getNotes())
                .status("PENDING")
                .build();

        ConsultationRequest saved = repository.save(entity);
        log.info("New Enterprise Consultation/Demo request registered from company: {}, email: {}, type: {}",
                saved.getCompanyName(), saved.getWorkEmail(), saved.getRequestType());

        return ConsultationResponse.from(saved);
    }

    @Transactional(transactionManager = "masterTransactionManager", readOnly = true)
    public List<ConsultationResponse> getAllRequests(String statusFilter) {
        List<ConsultationRequest> list;
        if (StringUtils.hasText(statusFilter) && !"ALL".equalsIgnoreCase(statusFilter)) {
            list = repository.findByStatusOrderByCreatedAtDesc(statusFilter.toUpperCase());
        } else {
            list = repository.findAllByOrderByCreatedAtDesc();
        }
        return list.stream().map(ConsultationResponse::from).toList();
    }

    @Transactional(transactionManager = "masterTransactionManager", readOnly = true)
    public ConsultationResponse getRequestById(Long id) {
        ConsultationRequest entity = repository.findById(id)
                .orElseThrow(() -> new BusinessException("Yêu cầu tư vấn không tồn tại", HttpStatus.NOT_FOUND, "REQUEST_NOT_FOUND"));
        return ConsultationResponse.from(entity);
    }

    @Transactional(transactionManager = "masterTransactionManager")
    public ConsultationResponse updateStatus(Long id, UpdateConsultationStatusRequest request) {
        String nextStatus = request.getStatus().toUpperCase();
        if (!VALID_STATUSES.contains(nextStatus)) {
            throw new BusinessException("Trạng thái không hợp lệ: " + nextStatus, HttpStatus.BAD_REQUEST, "INVALID_STATUS");
        }

        ConsultationRequest entity = repository.findById(id)
                .orElseThrow(() -> new BusinessException("Yêu cầu tư vấn không tồn tại", HttpStatus.NOT_FOUND, "REQUEST_NOT_FOUND"));

        entity.setStatus(nextStatus);
        if (StringUtils.hasText(request.getNotes())) {
            entity.setNotes(request.getNotes());
        }

        ConsultationRequest saved = repository.save(entity);
        log.info("Consultation request #{} status updated to: {}", id, nextStatus);
        return ConsultationResponse.from(saved);
    }
}
