-- V61: AI Localized Contents cache for progressive multi-language AI evaluations
CREATE TABLE ai_localized_contents (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    entity_type VARCHAR(64) NOT NULL,
    entity_id BIGINT NOT NULL,
    content_hash VARCHAR(64) NOT NULL,
    locale VARCHAR(16) NOT NULL,
    source_locale VARCHAR(16) NOT NULL DEFAULT 'vi',
    localized_json JSON NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uk_ai_loc_content UNIQUE (entity_type, entity_id, content_hash, locale)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_ai_loc_lookup ON ai_localized_contents (entity_type, entity_id, locale);

