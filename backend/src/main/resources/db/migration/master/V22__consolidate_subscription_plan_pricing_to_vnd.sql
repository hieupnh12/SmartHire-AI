-- V22: Consolidate subscription plan pricing to single VND price_yearly column

-- 1. Ensure price_yearly has sufficient precision for VND figures (e.g. 100M+ VND)
ALTER TABLE subscription_plans
    ALTER COLUMN price_yearly TYPE DECIMAL(15,2);

-- 2. Migrate existing VND pricing into price_yearly if available
UPDATE subscription_plans
SET price_yearly = price_yearly_vnd
WHERE price_yearly_vnd IS NOT NULL AND price_yearly_vnd > 0;

-- 3. Drop obsolete price columns
ALTER TABLE subscription_plans
    DROP COLUMN IF EXISTS price_monthly,
    DROP COLUMN IF EXISTS price_monthly_vnd,
    DROP COLUMN IF EXISTS price_yearly_vnd;
