-- V35: Seed QUESTION_GEN for recruiter question-bank drafting (Admin > AI Config).
INSERT INTO ai_model_configs (task_type, task_name, provider, model_name, temperature, max_tokens, timeout_seconds)
VALUES
    ('QUESTION_GEN', 'Sinh câu hỏi ngân hàng assessment (MCQ / nhiều đáp án / tự luận)', 'GEMINI', 'gemini-2.0-flash', 0.40, 4096, 45)
ON CONFLICT (task_type) DO NOTHING;
