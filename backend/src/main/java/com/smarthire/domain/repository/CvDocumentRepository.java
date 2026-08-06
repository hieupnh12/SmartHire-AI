package com.smarthire.domain.repository;

import com.smarthire.domain.entity.CvDocument;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CvDocumentRepository extends JpaRepository<CvDocument, Long> {
}
