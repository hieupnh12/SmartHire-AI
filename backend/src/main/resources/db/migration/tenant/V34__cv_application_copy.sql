ALTER TABLE cvs
    ADD COLUMN is_application_copy TINYINT(1) NOT NULL DEFAULT 0 AFTER application_id;
