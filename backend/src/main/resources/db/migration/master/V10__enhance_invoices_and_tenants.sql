-- Enhance Invoices & Tenants tables for Enterprise B2B Billing & Environment Tagging

ALTER TABLE invoices
    ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(64) NULL,
    ADD COLUMN IF NOT EXISTS due_date TIMESTAMP NULL,
    ADD COLUMN IF NOT EXISTS notes TEXT NULL,
    ADD COLUMN IF NOT EXISTS billing_period_start TIMESTAMP NULL,
    ADD COLUMN IF NOT EXISTS billing_period_end TIMESTAMP NULL,
    ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10,2) NULL,
    ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,2) DEFAULT 0.00;

CREATE UNIQUE INDEX IF NOT EXISTS uk_invoices_number ON invoices (invoice_number);

ALTER TABLE tenants
    ADD COLUMN IF NOT EXISTS environment_type VARCHAR(32) NOT NULL DEFAULT 'PRODUCTION';
