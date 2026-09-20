-- V12: Vietnam Legal Compliance for B2B e-Contracts & Public Signing
ALTER TABLE contracts
    ADD COLUMN party_a_name VARCHAR(255) NOT NULL DEFAULT 'CÔNG TY CỔ PHẦN CÔNG NGHỆ SMARTHIRE VIỆT NAM',
    ADD COLUMN party_a_tax_code VARCHAR(50) NOT NULL DEFAULT '0110889988',
    ADD COLUMN party_a_address VARCHAR(512) NOT NULL DEFAULT 'Tòa nhà Keangnam Landmark 72, Đường Phạm Hùng, Phường Mễ Trì, Quận Nam Từ Liêm, TP. Hà Nội',
    ADD COLUMN party_a_representative VARCHAR(255) NOT NULL DEFAULT 'Phan Nhật Hưng',
    ADD COLUMN party_a_position VARCHAR(255) NOT NULL DEFAULT 'Tổng Giám Đốc',
    ADD COLUMN party_a_phone VARCHAR(50) NOT NULL DEFAULT '1900 6868',
    ADD COLUMN party_a_email VARCHAR(255) NOT NULL DEFAULT 'legal@smarthire.top',
    ADD COLUMN party_a_bank_name VARCHAR(255) NOT NULL DEFAULT 'Ngân hàng TMCP Kỹ Thương Việt Nam (Techcombank)',
    ADD COLUMN party_a_bank_account VARCHAR(100) NOT NULL DEFAULT '190388889999',
    ADD COLUMN party_a_bank_branch VARCHAR(255) NOT NULL DEFAULT 'Chi nhánh Hà Nội',
    
    ADD COLUMN party_b_name VARCHAR(255) NULL,
    ADD COLUMN party_b_tax_code VARCHAR(50) NULL,
    ADD COLUMN party_b_address VARCHAR(512) NULL,
    ADD COLUMN party_b_representative VARCHAR(255) NULL,
    ADD COLUMN party_b_position VARCHAR(255) NULL,
    ADD COLUMN party_b_phone VARCHAR(50) NULL,
    ADD COLUMN party_b_email VARCHAR(255) NULL,
    ADD COLUMN party_b_bank_account VARCHAR(100) NULL,
    
    ADD COLUMN tax_rate DECIMAL(5, 2) NOT NULL DEFAULT 10.00,
    ADD COLUMN tax_amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN amount_in_words VARCHAR(512) NULL,
    
    ADD COLUMN signing_token VARCHAR(128) NULL UNIQUE,
    ADD COLUMN token_expires_at TIMESTAMP NULL,
    ADD COLUMN sent_at TIMESTAMP NULL,
    ADD COLUMN otp_code VARCHAR(10) NULL,
    ADD COLUMN otp_expires_at TIMESTAMP NULL,
    ADD COLUMN client_ip VARCHAR(64) NULL;

CREATE INDEX idx_contracts_signing_token ON contracts (signing_token);
