-- gemini-2.0-flash and the 1.5 family were shut down. CV parsing then failed and fell back to heuristic.
-- Replace only those obsolete defaults; keep a model an administrator already selected.
UPDATE ai_model_configs
SET model_name = 'gemini-3.6-flash', updated_at = CURRENT_TIMESTAMP
WHERE task_type = 'CV_PARSING'
  AND provider = 'GEMINI'
  AND model_name IN ('gemini-2.0-flash', 'gemini-2.0-flash-001', 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash-lite');

UPDATE ai_model_configs
SET failover_model = 'gemini-3.6-flash', updated_at = CURRENT_TIMESTAMP
WHERE task_type = 'CV_PARSING'
  AND failover_provider = 'GEMINI'
  AND failover_model IN ('gemini-2.0-flash', 'gemini-2.0-flash-001', 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash-lite');
