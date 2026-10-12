CREATE TABLE company_directory_entries (
    id BIGINT NOT NULL AUTO_INCREMENT,
    entry_type VARCHAR(32) NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT uk_company_directory_type_name UNIQUE (entry_type, name)
);

INSERT IGNORE INTO company_directory_entries (entry_type, name)
SELECT 'DEPARTMENT', TRIM(department)
FROM jobs
WHERE department IS NOT NULL AND TRIM(department) <> '';

INSERT IGNORE INTO company_directory_entries (entry_type, name)
SELECT 'LOCATION', TRIM(location)
FROM jobs
WHERE location IS NOT NULL AND TRIM(location) <> '';
