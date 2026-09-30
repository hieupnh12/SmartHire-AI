-- V19: Xóa bỏ các cột signer cũ từ V11 vì đã được thay thế bằng hệ thống party_b_ (V12)
ALTER TABLE contracts
DROP COLUMN IF EXISTS signer_name,
DROP COLUMN IF EXISTS signer_email,
DROP COLUMN IF EXISTS signer_title;
