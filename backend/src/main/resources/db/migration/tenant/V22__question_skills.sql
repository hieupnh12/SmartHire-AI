CREATE TABLE questionskills (
    question_id BIGINT NOT NULL,
    skill_id    BIGINT NOT NULL,
    PRIMARY KEY (question_id, skill_id),
    KEY idx_questionskills_skill (skill_id),
    CONSTRAINT fk_questionskills_question FOREIGN KEY (question_id)
        REFERENCES questions (id) ON DELETE CASCADE,
    CONSTRAINT fk_questionskills_skill FOREIGN KEY (skill_id)
        REFERENCES skills (id) ON DELETE CASCADE
);
