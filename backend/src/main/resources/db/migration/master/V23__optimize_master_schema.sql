-- V23: Optimize Master Schema Relationships, Precision and Audit Trails

-- 1. Scale precision for invoice line items to support large VND amounts (matches V21 invoices scale)
ALTER TABLE invoice_line_items
    ALTER COLUMN unit_price TYPE DECIMAL(15,2),
    ALTER COLUMN total_price TYPE DECIMAL(15,2);

-- 2. Link Invoices to Contracts and Subscriptions, add updated_at timestamp, update default currency to VND
ALTER TABLE invoices
    ADD COLUMN IF NOT EXISTS contract_id BIGINT NULL,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE invoices
    ALTER COLUMN currency SET DEFAULT 'VND';

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_inv_contract') THEN
        ALTER TABLE invoices ADD CONSTRAINT fk_inv_contract
            FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_inv_subscription') THEN
        ALTER TABLE invoices ADD CONSTRAINT fk_inv_subscription
            FOREIGN KEY (subscription_id) REFERENCES tenant_subscriptions(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_invoices_contract_id ON invoices(contract_id);
CREATE INDEX IF NOT EXISTS idx_invoices_subscription_id ON invoices(subscription_id);

-- 3. Link Consultation Requests (Leads) to Provisioned Tenants
ALTER TABLE consultation_requests
    ADD COLUMN IF NOT EXISTS tenant_id BIGINT NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_cr_tenant') THEN
        ALTER TABLE consultation_requests ADD CONSTRAINT fk_cr_tenant
            FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_consultation_requests_tenant_id ON consultation_requests(tenant_id);

-- 4. Foreign key for payment_transactions.tenant_id
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_pt_tenant') THEN
        ALTER TABLE payment_transactions ADD CONSTRAINT fk_pt_tenant
            FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_pt_tenant_id ON payment_transactions(tenant_id);

-- 5. Add timestamps to contract_signatures & update contracts default currency to VND
ALTER TABLE contract_signatures
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE contracts
    ALTER COLUMN currency SET DEFAULT 'VND';

-- 6. Add performance indexes for system logs
CREATE INDEX IF NOT EXISTS idx_mnl_tenant_code ON master_notification_logs(tenant_code);
CREATE INDEX IF NOT EXISTS idx_mnl_status ON master_notification_logs(status);
CREATE INDEX IF NOT EXISTS idx_mnl_sent_at ON master_notification_logs(sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_pal_tenant_code ON platform_audit_logs(tenant_code);
CREATE INDEX IF NOT EXISTS idx_pal_created_at ON platform_audit_logs(created_at DESC);
