-- V60: Audit table for AI Interview RAG & Vector semantic evaluation
CREATE TABLE IF NOT EXISTS ai_interview_rag_audits (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    ai_interview_id BIGINT NOT NULL,
    ai_question_id BIGINT NULL,
    candidate_answer TEXT,
    similarity_score DECIMAL(5, 4),
    threshold_used DECIMAL(5, 4) NOT NULL DEFAULT 0.6500,
    matched_keypoints_json JSON,
    missing_keypoints_json JSON,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_rag_audit_interview FOREIGN KEY (ai_interview_id) REFERENCES ai_interviews(id) ON DELETE CASCADE,
    CONSTRAINT fk_rag_audit_question FOREIGN KEY (ai_question_id) REFERENCES ai_questions(id) ON DELETE CASCADE
);

CREATE INDEX idx_rag_audit_interview ON ai_interview_rag_audits(ai_interview_id);

