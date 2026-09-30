-- V18: Allow NULL values for advanced subscription quotas to support "Unlimited" limits
ALTER TABLE subscription_plans ALTER COLUMN max_ai_interview_hours DROP NOT NULL;
ALTER TABLE subscription_plans ALTER COLUMN max_storage_gb DROP NOT NULL;
ALTER TABLE subscription_plans ALTER COLUMN max_proctoring_hours DROP NOT NULL;
ALTER TABLE subscription_plans ALTER COLUMN video_retention_days DROP NOT NULL;
