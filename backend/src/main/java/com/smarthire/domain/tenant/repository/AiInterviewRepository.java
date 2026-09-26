package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.enums.AiInterviewStatus;
import com.smarthire.domain.tenant.entity.AiInterview;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AiInterviewRepository extends JpaRepository<AiInterview, Long> {
    List<AiInterview> findByApplication_IdOrderByIdDesc(Long applicationId);

    Page<AiInterview> findByApplication_Id(Long applicationId, Pageable pageable);

    Page<AiInterview> findByStatus(AiInterviewStatus status, Pageable pageable);

    Page<AiInterview> findByApplication_IdAndStatus(Long applicationId, AiInterviewStatus status, Pageable pageable);
}
