-- Cho phép tenant_id được null để hỗ trợ tạo Hợp đồng trước khi cấp phát Workspace (Contract First)
ALTER TABLE contracts ALTER COLUMN tenant_id DROP NOT NULL;
