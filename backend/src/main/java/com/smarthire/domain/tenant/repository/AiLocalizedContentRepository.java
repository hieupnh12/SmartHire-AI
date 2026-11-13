package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.tenant.entity.AiLocalizedContent;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AiLocalizedContentRepository extends JpaRepository<AiLocalizedContent, Long> {

    Optional<AiLocalizedContent> findByEntityTypeAndEntityIdAndContentHashAndLocale(
            String entityType, Long entityId, String contentHash, String locale);

    Optional<AiLocalizedContent> findFirstByEntityTypeAndEntityIdAndLocaleOrderByUpdatedAtDesc(
            String entityType, Long entityId, String locale);

    List<AiLocalizedContent> findByEntityTypeAndEntityId(String entityType, Long entityId);

    void deleteByEntityTypeAndEntityId(String entityType, Long entityId);
}

