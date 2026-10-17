ALTER TABLE tests ADD COLUMN objective_duration_minutes INT NULL;
ALTER TABLE questions ADD COLUMN rubric_json JSON NULL;
ALTER TABLE submissions ADD COLUMN objective_completed_at TIMESTAMP NULL;
ALTER TABLE answers ADD COLUMN language VARCHAR(32) NULL,
    ADD COLUMN evaluation_json JSON NULL,
    ADD COLUMN suggested_score DECIMAL(10,2) NULL,
    ADD COLUMN reviewed_by BIGINT NULL,
    ADD COLUMN reviewed_at TIMESTAMP NULL,
    ADD CONSTRAINT fk_answer_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id);
ALTER TABLE coding_problems MODIFY test_id BIGINT NULL,
    ADD COLUMN question_id BIGINT NULL,
    ADD COLUMN category VARCHAR(32) NOT NULL DEFAULT 'CODING_ALGORITHM',
    ADD COLUMN starter_code_json JSON NULL,
    ADD COLUMN harness_json JSON NULL,
    ADD CONSTRAINT fk_cp_question FOREIGN KEY (question_id) REFERENCES questions(id),
    ADD UNIQUE KEY uk_cp_question (question_id);
-- Preserve old essays and their authoring data; never invent executable hidden tests.
UPDATE questions SET rubric_json = JSON_OBJECT('referenceAnswer', explanation,
    'criteria', JSON_ARRAY(JSON_OBJECT('description', 'Technical correctness and completeness', 'weight', 100)))
WHERE question_type = 'ESSAY' AND explanation IS NOT NULL;
