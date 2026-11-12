-- V37: Unify Party A legal entity defaults to Da Nang cluster & TPBank shared bank account
ALTER TABLE contracts
    ALTER COLUMN party_a_tax_code SET DEFAULT '0110888999',
    ALTER COLUMN party_a_address SET DEFAULT 'Tầng 13, Tòa nhà FPT, Trường Đại học FPT Đà Nẵng, Khu đô thị Công nghệ FPT, Phường Hòa Hải, Quận Ngũ Hành Sơn, TP. Đà Nẵng',
    ALTER COLUMN party_a_phone SET DEFAULT '0988.888.888',
    ALTER COLUMN party_a_email SET DEFAULT 'support@smarthire.top',
    ALTER COLUMN party_a_bank_name SET DEFAULT 'Ngân hàng TMCP Tiên Phong (TPBank)',
    ALTER COLUMN party_a_bank_account SET DEFAULT '07744348801',
    ALTER COLUMN party_a_bank_branch SET DEFAULT 'Chi nhánh Đà Nẵng';
