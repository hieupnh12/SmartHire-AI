package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.tenant.entity.Recommendation;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RecommendationRepository extends JpaRepository<Recommendation, Long> {
    List<Recommendation> findBySubjectTypeAndSubjectIdAndTargetTypeOrderByScoreDesc(
            String subjectType, Long subjectId, String targetType);

    void deleteBySubjectTypeAndSubjectIdAndTargetType(
            String subjectType, Long subjectId, String targetType);
}
