package com.smarthire.domain.tenant.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "ai_localized_contents")
public class AiLocalizedContent extends BaseEntity {

    @Column(name = "entity_type", nullable = false, length = 64)
    String entityType;

    @Column(name = "entity_id", nullable = false)
    Long entityId;

    @Column(name = "content_hash", nullable = false, length = 64)
    String contentHash;

    @Column(name = "locale", nullable = false, length = 16)
    String locale;

    @Column(name = "source_locale", nullable = false, length = 16)
    String sourceLocale;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "localized_json", nullable = false, columnDefinition = "json")
    String localizedJson;
}

