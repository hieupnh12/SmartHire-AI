CREATE TABLE ai_interview_process_runs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    ai_interview_id BIGINT NOT NULL,
    process_key VARCHAR(64) NOT NULL,
    process_order INT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    main_question_target INT NOT NULL DEFAULT 0,
    main_question_generated INT NOT NULL DEFAULT 0,
    main_question_completed INT NOT NULL DEFAULT 0,
    follow_up_count INT NOT NULL DEFAULT 0,
    score DECIMAL(10,2) NULL,
    config_snapshot_json JSON NOT NULL,
    report_json JSON NULL,
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_ai_process_interview FOREIGN KEY (ai_interview_id) REFERENCES ai_interviews(id) ON DELETE CASCADE,
    CONSTRAINT uk_ai_process_order UNIQUE (ai_interview_id, process_order),
    CONSTRAINT uk_ai_process_key UNIQUE (ai_interview_id, process_key)
);

ALTER TABLE ai_questions
    ADD COLUMN process_run_id BIGINT NULL,
    ADD COLUMN parent_question_id BIGINT NULL,
    ADD COLUMN question_role VARCHAR(16) NOT NULL DEFAULT 'MAIN',
    ADD COLUMN sequence_no INT NOT NULL DEFAULT 0,
    ADD CONSTRAINT fk_ai_question_process FOREIGN KEY (process_run_id) REFERENCES ai_interview_process_runs(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_ai_question_parent FOREIGN KEY (parent_question_id) REFERENCES ai_questions(id) ON DELETE SET NULL;

CREATE INDEX idx_ai_process_current ON ai_interview_process_runs(ai_interview_id, process_order, status);
CREATE INDEX idx_ai_question_process_sequence ON ai_questions(process_run_id, sequence_no, id);
