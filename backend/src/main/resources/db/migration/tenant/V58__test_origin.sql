ALTER TABLE tests
    ADD COLUMN origin VARCHAR(32) NOT NULL DEFAULT 'AUTHORED';

UPDATE tests
SET origin = 'GENERATED'
WHERE description = 'Tạo tự động từ ngân hàng câu hỏi theo cấu hình của job.';
