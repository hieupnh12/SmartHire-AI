package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.tenant.entity.CvDocument;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CvDocumentRepository extends JpaRepository<CvDocument, Long> {
}

