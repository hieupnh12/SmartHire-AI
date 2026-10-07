CREATE TABLE interview_sessions (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    ai_interview_id BIGINT NOT NULL,
    max_turns INT NOT NULL,
    candidate_turns INT NOT NULL DEFAULT 0,
    ended_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_interview_session_attempt UNIQUE (ai_interview_id),
    CONSTRAINT fk_interview_session_attempt FOREIGN KEY (ai_interview_id) REFERENCES ai_interviews(id) ON DELETE CASCADE
);

CREATE TABLE interview_messages (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    session_id BIGINT NOT NULL,
    sequence_no INT NOT NULL,
    role VARCHAR(16) NOT NULL,
    content TEXT NOT NULL,
    client_request_id VARCHAR(36) NULL,
    recording_key VARCHAR(512) NULL,
    recording_mime VARCHAR(128) NULL,
    recording_size BIGINT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_interview_message_sequence UNIQUE (session_id, sequence_no),
    CONSTRAINT uk_interview_message_request UNIQUE (session_id, client_request_id),
    CONSTRAINT fk_interview_message_session FOREIGN KEY (session_id) REFERENCES interview_sessions(id) ON DELETE CASCADE
);
