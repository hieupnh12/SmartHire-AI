-- AI Interview rounds use 30-40 generated questions.
ALTER TABLE jobs ALTER COLUMN ai_interview_question_count SET DEFAULT 30;
UPDATE jobs SET ai_interview_question_count = 30 WHERE ai_interview_question_count < 30;
UPDATE jobs SET ai_interview_question_count = 40 WHERE ai_interview_question_count > 40;

-- Append-only activity trail of every step the AI Interview pipeline performs.
CREATE TABLE ai_interview_logs (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    ai_interview_id BIGINT NOT NULL,
    event           VARCHAR(64) NOT NULL,
    status          VARCHAR(32) NULL,
    detail          VARCHAR(1000) NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_ai_interview_logs_interview (ai_interview_id, id),
    CONSTRAINT fk_ai_log_interview FOREIGN KEY (ai_interview_id)
        REFERENCES ai_interviews (id) ON DELETE CASCADE
);
