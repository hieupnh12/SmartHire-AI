-- V32: Add multi-tier AI fallback chain to ai_model_configs
ALTER TABLE ai_model_configs
    ADD COLUMN IF NOT EXISTS fallback_chain JSONB NULL;

COMMENT ON COLUMN ai_model_configs.fallback_chain IS 'Ordered JSON array of fallback models: [{"provider":"GROQ","model":"qwen/qwen3.8-27b","timeout_seconds":15},...]';
