package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.tenant.entity.Cv;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CvRepository extends JpaRepository<Cv, Long> {
    List<Cv> findByJob_IdOrderByIdDesc(Long jobId);
    List<Cv> findByCandidate_IdOrderByIdDesc(Long candidateId);
    List<Cv> findByCandidate_IdAndApplicationCopyFalseOrderByIdDesc(Long candidateId);
    List<Cv> findByApplication_IdOrderByIdDesc(Long applicationId);
    List<Cv> findByCandidate_IdAndJob_IdOrderByIdDesc(Long candidateId, Long jobId);
    Optional<Cv> findByShareToken(String shareToken);
}
