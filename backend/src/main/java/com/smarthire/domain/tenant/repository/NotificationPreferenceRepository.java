package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.enums.NotificationCategory;
import com.smarthire.domain.tenant.entity.NotificationPreference;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationPreferenceRepository extends JpaRepository<NotificationPreference, Long> {
    List<NotificationPreference> findByUser_Id(Long userId);
    Optional<NotificationPreference> findByUser_IdAndCategory(Long userId, NotificationCategory category);

    List<NotificationPreference> findByCandidate_Id(Long candidateId);
    Optional<NotificationPreference> findByCandidate_IdAndCategory(Long candidateId, NotificationCategory category);
}
