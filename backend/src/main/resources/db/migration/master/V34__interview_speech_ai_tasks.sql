-- V34: AI Interview speech tasks (STT/TTS) are configured in Admin > AI Config like every other AI task.
-- Native speech requires a GEMINI provider; API key comes from ai_provider_keys.

INSERT INTO ai_model_configs (task_type, task_name, provider, model_name, temperature, max_tokens, timeout_seconds)
VALUES
    ('INTERVIEW_STT', 'Chuyển giọng nói ứng viên thành văn bản (AI Interview)', 'GEMINI', 'gemini-3.1-flash-lite', 0.00, 2048, 60),
    ('INTERVIEW_TTS', 'Đọc câu hỏi phỏng vấn bằng giọng nói (AI Interview)', 'GEMINI', 'gemini-3.8-flash-tts', 0.00, 2048, 60)
ON CONFLICT (task_type) DO NOTHING;
