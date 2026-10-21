-- gemini-3.6-flash answers 503 under load, and V29 set the failover to the same model,
-- so CV parsing fell straight back to the heuristic extractor.
-- Use a model that currently serves generateContent, and a different failover.
UPDATE ai_model_configs
SET model_name = 'gemini-3.5-flash-lite', updated_at = CURRENT_TIMESTAMP
WHERE task_type = 'CV_PARSING'
  AND provider = 'GEMINI'
  AND model_name IN ('gemini-3.6-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-001', 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash-lite');

UPDATE ai_model_configs
SET failover_model = 'gemini-3.1-flash-lite', updated_at = CURRENT_TIMESTAMP
WHERE task_type = 'CV_PARSING'
  AND failover_provider = 'GEMINI'
  AND failover_model IN ('gemini-3.6-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-001', 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash-lite');
