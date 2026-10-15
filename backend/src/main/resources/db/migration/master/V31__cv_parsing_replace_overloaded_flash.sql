-- The platform row was moved to gemini-3.8-flash, which also returns 503 under load.
-- Replace only that overloaded CV parsing model. Keep any other model an admin selected.
UPDATE ai_model_configs
SET model_name = 'gemini-3.5-flash-lite', updated_at = CURRENT_TIMESTAMP
WHERE task_type = 'CV_PARSING'
  AND provider = 'GEMINI'
  AND model_name = 'gemini-3.8-flash';
