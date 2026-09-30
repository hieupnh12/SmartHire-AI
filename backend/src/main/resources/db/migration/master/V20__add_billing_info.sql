-- V20: Add billing info, tax information and VND pricing for self-service checkout

-- 1. Add company tax and legal billing info to tenants
ALTER TABLE tenants
    ADD COLUMN IF NOT EXISTS tax_code VARCHAR(50) NULL,
    ADD COLUMN IF NOT EXISTS company_legal_name VARCHAR(255) NULL,
    ADD COLUMN IF NOT EXISTS billing_address VARCHAR(512) NULL;

-- 2. Add billing snapshot and payment proof to invoices
ALTER TABLE invoices
    ADD COLUMN IF NOT EXISTS payment_proof_url VARCHAR(512) NULL,
    ADD COLUMN IF NOT EXISTS billing_tax_code VARCHAR(50) NULL,
    ADD COLUMN IF NOT EXISTS billing_legal_name VARCHAR(255) NULL,
    ADD COLUMN IF NOT EXISTS billing_address VARCHAR(512) NULL;

-- 3. Add VND pricing columns to subscription plans
ALTER TABLE subscription_plans
    ADD COLUMN IF NOT EXISTS price_monthly_vnd DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS price_yearly_vnd DECIMAL(15,2) NOT NULL DEFAULT 0.00;

-- 4. Seed / update VND pricing for existing default plans
UPDATE subscription_plans
SET price_monthly_vnd = 1200000.00, price_yearly_vnd = 12000000.00
WHERE code = 'STARTER';

UPDATE subscription_plans
SET price_monthly_vnd = 3600000.00, price_yearly_vnd = 36000000.00
WHERE code = 'PROFESSIONAL';

UPDATE subscription_plans
SET price_monthly_vnd = 9900000.00, price_yearly_vnd = 99000000.00
WHERE code = 'ENTERPRISE';
