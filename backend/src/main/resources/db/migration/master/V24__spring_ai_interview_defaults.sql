-- Preserve administrator-selected models; replace only obsolete Gemini interview defaults.
UPDATE ai_model_configs
SET model_name = 'gemini-2.5-flash', max_tokens = GREATEST(max_tokens, 8192), updated_at = CURRENT_TIMESTAMP
WHERE task_type IN ('INTERVIEW_GEN', 'INTERVIEW_NLP')
  AND provider = 'GEMINI'
  AND model_name IN ('gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro');
