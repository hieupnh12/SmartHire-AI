CREATE TABLE ai_interview_consents (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    ai_interview_id BIGINT NOT NULL,
    candidate_id BIGINT NOT NULL,
    accepted BOOLEAN NOT NULL,
    policy_version VARCHAR(64) NOT NULL,
    consented_at TIMESTAMP NOT NULL,
    user_agent VARCHAR(512) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ai_consent_interview FOREIGN KEY (ai_interview_id) REFERENCES ai_interviews(id) ON DELETE CASCADE,
    CONSTRAINT fk_ai_consent_candidate FOREIGN KEY (candidate_id) REFERENCES users(id),
    CONSTRAINT uk_ai_consent_interview UNIQUE (ai_interview_id)
);

CREATE TABLE ai_answer_recordings (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    ai_answer_id BIGINT NOT NULL,
    storage_key VARCHAR(512) NOT NULL,
    mime_type VARCHAR(128) NOT NULL,
    size_bytes BIGINT NULL,
    duration_seconds INT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'UPLOADING',
    transcript_raw TEXT NULL,
    transcript_confidence DECIMAL(5,2) NULL,
    stt_provider VARCHAR(64) NULL,
    started_at TIMESTAMP NULL,
    ended_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ai_recording_answer FOREIGN KEY (ai_answer_id) REFERENCES ai_answers(id) ON DELETE CASCADE,
    CONSTRAINT uk_ai_recording_answer UNIQUE (ai_answer_id)
);

CREATE INDEX idx_ai_recording_status ON ai_answer_recordings(status, id);
