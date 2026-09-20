package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.tenant.entity.CvDocument;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CvDocumentRepository extends JpaRepository<CvDocument, Long> {
    Optional<CvDocument> findByCv_Id(Long cvId);
    void deleteByCv_Id(Long cvId);
}
