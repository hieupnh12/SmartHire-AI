-- V33: Enhance ai_model_pricings into comprehensive AI Model Registry & Catalog

ALTER TABLE ai_model_pricings
    ADD COLUMN IF NOT EXISTS display_name VARCHAR(100) NULL,
    ADD COLUMN IF NOT EXISTS context_window INT NOT NULL DEFAULT 128000,
    ADD COLUMN IF NOT EXISTS supports_json BOOLEAN NOT NULL DEFAULT TRUE;

-- Update existing seeds with friendly display names and context windows
UPDATE ai_model_pricings SET display_name = 'Gemini 2.5 Flash', context_window = 1048576 WHERE provider = 'GEMINI' AND model_name = 'gemini-2.5-flash';
UPDATE ai_model_pricings SET display_name = 'Gemini 2.5 Pro', context_window = 2097152 WHERE provider = 'GEMINI' AND model_name = 'gemini-2.5-pro';
UPDATE ai_model_pricings SET display_name = 'Gemini 2.0 Flash', context_window = 1048576 WHERE provider = 'GEMINI' AND model_name = 'gemini-2.0-flash';
UPDATE ai_model_pricings SET display_name = 'Gemini 1.5 Flash', context_window = 1048576 WHERE provider = 'GEMINI' AND model_name = 'gemini-1.5-flash';
UPDATE ai_model_pricings SET display_name = 'Gemini 1.5 Pro', context_window = 2097152 WHERE provider = 'GEMINI' AND model_name = 'gemini-1.5-pro';
UPDATE ai_model_pricings SET display_name = 'GPT-4o Mini', context_window = 128000 WHERE provider = 'OPENAI' AND model_name = 'gpt-4o-mini';
UPDATE ai_model_pricings SET display_name = 'GPT-4o', context_window = 128000 WHERE provider = 'OPENAI' AND model_name = 'gpt-4o';
UPDATE ai_model_pricings SET display_name = 'Claude 3.5 Sonnet', context_window = 200000 WHERE provider = 'ANTHROPIC' AND model_name = 'claude-3-5-sonnet-20241022';
UPDATE ai_model_pricings SET display_name = 'DeepSeek Chat V3', context_window = 64000 WHERE provider = 'DEEPSEEK' AND model_name = 'deepseek-chat';
UPDATE ai_model_pricings SET display_name = 'DeepSeek Reasoner R1', context_window = 64000 WHERE provider = 'DEEPSEEK' AND model_name = 'deepseek-reasoner';

-- Seed popular missing models for Groq, OpenRouter, Gemini Lite, Cursor
INSERT INTO ai_model_pricings (provider, model_name, display_name, input_price_per_1m_tokens, output_price_per_1m_tokens, context_window, supports_json, is_active)
VALUES
    -- Gemini Free / Low-tier
    ('GEMINI', 'gemini-3.5-flash-lite', 'Gemini 3.5 Flash Lite (Free / Fast)', 0.0750, 0.3000, 1048576, TRUE, TRUE),
    ('GEMINI', 'gemini-3.8-flash', 'Gemini 3.8 Flash (Latest Preview)', 0.1500, 0.6000, 1048576, TRUE, TRUE),
    ('GEMINI', 'gemini-3.7-flash', 'Gemini 3.7 Flash', 0.1500, 0.6000, 1048576, TRUE, TRUE),
    -- Groq (Ultra-fast inference, free rate limits / $0.00 pricing)
    ('GROQ', 'qwen/qwen3.8-27b', 'Qwen 3.8 27B (Groq - 500ms)', 0.0000, 0.0000, 131072, TRUE, TRUE),
    ('GROQ', 'openai/gpt-oss-120b', 'GPT-OSS 120B (Groq)', 0.0000, 0.0000, 131072, TRUE, TRUE),
    ('GROQ', 'openai/gpt-oss-20b', 'GPT-OSS 20B (Groq - Fast)', 0.0000, 0.0000, 131072, TRUE, TRUE),
    ('GROQ', 'llama-3.3-70b-versatile', 'Llama 3.3 70B Versatile (Groq)', 0.0000, 0.0000, 128000, TRUE, TRUE),
    ('GROQ', 'llama-3.1-8b-instant', 'Llama 3.1 8B Instant (Groq)', 0.0000, 0.0000, 128000, TRUE, TRUE),
    ('GROQ', 'deepseek-r1-distill-llama-70b', 'DeepSeek R1 Distill 70B (Groq)', 0.0000, 0.0000, 128000, TRUE, TRUE),
    -- OpenRouter (Free models & aggregator)
    ('OPENROUTER', 'deepseek/deepseek-r1:free', 'DeepSeek R1 (OpenRouter Free)', 0.0000, 0.0000, 64000, TRUE, TRUE),
    ('OPENROUTER', 'meta-llama/llama-3.3-70b-instruct:free', 'Llama 3.3 70B (OpenRouter Free)', 0.0000, 0.0000, 128000, TRUE, TRUE),
    ('OPENROUTER', 'google/gemini-2.5-flash', 'Gemini 2.5 Flash (OpenRouter)', 0.1500, 0.6000, 1048576, TRUE, TRUE),
    ('OPENROUTER', 'anthropic/claude-3.5-sonnet', 'Claude 3.5 Sonnet (OpenRouter)', 3.0000, 15.0000, 200000, TRUE, TRUE),
    -- Cursor AI
    ('CURSOR', 'claude-sonnet-4-5', 'Claude Sonnet 4.5 (Cursor)', 0.0000, 0.0000, 200000, TRUE, TRUE),
    ('CURSOR', 'claude-haiku-4-5', 'Claude Haiku 4.5 (Cursor)', 0.0000, 0.0000, 200000, TRUE, TRUE),
    ('CURSOR', 'gpt-5.1', 'GPT-5.1 (Cursor)', 0.0000, 0.0000, 200000, TRUE, TRUE),
    -- Mistral & xAI
    ('MISTRAL', 'mistral-small-latest', 'Mistral Small (Latest)', 0.2000, 0.6000, 128000, TRUE, TRUE),
    ('MISTRAL', 'mistral-large-latest', 'Mistral Large (Latest)', 2.0000, 6.0000, 128000, TRUE, TRUE),
    ('XAI', 'grok-2-latest', 'Grok 2 (xAI)', 2.0000, 10.0000, 131072, TRUE, TRUE)
ON CONFLICT (provider, model_name) DO UPDATE SET
    display_name = COALESCE(ai_model_pricings.display_name, EXCLUDED.display_name),
    context_window = EXCLUDED.context_window,
    supports_json = EXCLUDED.supports_json;
