-- =================================================================================
-- V26: DROPBOX SIGN (HELLOSIGN) E-SIGNATURE INTEGRATION FOR B2B CONTRACTS
-- Replaces mock OTP/CA serial text signing with verifiable Dropbox Sign API v3
-- envelope tracking, signed PDF storage, and SHA-256 tamper-evident checksums.
-- =================================================================================

ALTER TABLE contracts
    ADD COLUMN IF NOT EXISTS esign_provider VARCHAR(32) DEFAULT 'DROPBOX_SIGN',
    ADD COLUMN IF NOT EXISTS external_signature_request_id VARCHAR(128),
    ADD COLUMN IF NOT EXISTS esign_details_url VARCHAR(512),
    ADD COLUMN IF NOT EXISTS esign_test_mode BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS signed_pdf_bytes BYTEA;

CREATE INDEX IF NOT EXISTS idx_contracts_external_sig_req_id
    ON contracts(external_signature_request_id);

ALTER TABLE contract_signatures
    ADD COLUMN IF NOT EXISTS external_signature_id VARCHAR(128);
