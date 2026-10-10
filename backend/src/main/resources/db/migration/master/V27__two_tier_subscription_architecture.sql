-- V27: Two-Tier B2B SaaS Subscription Architecture
-- Tier 1: Plan Catalog (Immutability, Versioning, Grandfathering Archive, Enterprise Custom Plan)
-- Tier 2: Tenant Subscription Instance (Resource/Price Snapshot, Lifecycle State Machine, Proration & Scheduled Downgrade)

-- ============================================================================
-- 1. TIER 1: Enhance subscription_plans (Plan Catalog / Templates)
-- ============================================================================
ALTER TABLE subscription_plans
    ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS parent_plan_id BIGINT NULL,
    ADD COLUMN IF NOT EXISTS is_custom BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS target_tenant_id BIGINT NULL,
    ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_sp_parent_plan') THEN
        ALTER TABLE subscription_plans ADD CONSTRAINT fk_sp_parent_plan
            FOREIGN KEY (parent_plan_id) REFERENCES subscription_plans(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_sp_target_tenant') THEN
        ALTER TABLE subscription_plans ADD CONSTRAINT fk_sp_target_tenant
            FOREIGN KEY (target_tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_sp_status_custom_archived
    ON subscription_plans(status, is_custom, is_archived);
CREATE INDEX IF NOT EXISTS idx_sp_target_tenant_id
    ON subscription_plans(target_tenant_id);

-- ============================================================================
-- 2. TIER 2: Enhance tenant_subscriptions (Subscription Instance & Snapshot)
-- ============================================================================
ALTER TABLE tenant_subscriptions
    ADD COLUMN IF NOT EXISTS plan_code_snapshot VARCHAR(64) NULL,
    ADD COLUMN IF NOT EXISTS plan_name_snapshot VARCHAR(128) NULL,
    ADD COLUMN IF NOT EXISTS plan_version_snapshot INT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS contracted_price_yearly DECIMAL(15,2) NULL,
    ADD COLUMN IF NOT EXISTS snapshot_max_jobs INT NULL,
    ADD COLUMN IF NOT EXISTS snapshot_max_cv_parses INT NULL,
    ADD COLUMN IF NOT EXISTS snapshot_max_ai_interview_hours INT NULL,
    ADD COLUMN IF NOT EXISTS snapshot_max_storage_gb INT NULL,
    ADD COLUMN IF NOT EXISTS snapshot_max_proctoring_hours INT NULL,
    ADD COLUMN IF NOT EXISTS snapshot_video_retention_days INT NULL,
    ADD COLUMN IF NOT EXISTS snapshot_features_json JSONB NULL,
    ADD COLUMN IF NOT EXISTS grace_period_ends_at TIMESTAMP NULL,
    ADD COLUMN IF NOT EXISTS next_plan_id BIGINT NULL,
    ADD COLUMN IF NOT EXISTS prorated_credit_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS upgraded_from_subscription_id BIGINT NULL,
    ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMP NULL,
    ADD COLUMN IF NOT EXISTS cancel_reason VARCHAR(255) NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ts_next_plan') THEN
        ALTER TABLE tenant_subscriptions ADD CONSTRAINT fk_ts_next_plan
            FOREIGN KEY (next_plan_id) REFERENCES subscription_plans(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ts_upgraded_from') THEN
        ALTER TABLE tenant_subscriptions ADD CONSTRAINT fk_ts_upgraded_from
            FOREIGN KEY (upgraded_from_subscription_id) REFERENCES tenant_subscriptions(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ts_tenant_status
    ON tenant_subscriptions(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_ts_ends_at_status
    ON tenant_subscriptions(ends_at, status);

-- Backfill existing tenant_subscriptions with snapshot values from their linked subscription_plans
UPDATE tenant_subscriptions ts
SET
    plan_code_snapshot = sp.code,
    plan_name_snapshot = sp.name,
    plan_version_snapshot = COALESCE(sp.version, 1),
    contracted_price_yearly = sp.price_yearly,
    snapshot_max_jobs = sp.max_jobs,
    snapshot_max_cv_parses = sp.max_cv_parses,
    snapshot_max_ai_interview_hours = sp.max_ai_interview_hours,
    snapshot_max_storage_gb = sp.max_storage_gb,
    snapshot_max_proctoring_hours = sp.max_proctoring_hours,
    snapshot_video_retention_days = sp.video_retention_days,
    snapshot_features_json = sp.features_json
FROM subscription_plans sp
WHERE ts.plan_id = sp.id
  AND ts.plan_code_snapshot IS NULL;
