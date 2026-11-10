-- V36: Remove VAT/tax columns from contracts and invoices
ALTER TABLE contracts
    DROP COLUMN IF EXISTS tax_rate,
    DROP COLUMN IF EXISTS tax_amount;

ALTER TABLE invoices
    DROP COLUMN IF EXISTS tax_rate;
