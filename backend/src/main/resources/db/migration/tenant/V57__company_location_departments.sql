CREATE TABLE company_location_departments (
    id              BIGINT NOT NULL AUTO_INCREMENT,
    location_name   VARCHAR(255) NOT NULL,
    department_name VARCHAR(128) NOT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT uk_company_loc_dept UNIQUE (location_name, department_name),
    KEY idx_cld_location (location_name),
    KEY idx_cld_department (department_name)
);

-- Backfill from existing jobs where both location and department are set
INSERT IGNORE INTO company_location_departments (location_name, department_name)
SELECT TRIM(location), TRIM(department)
FROM jobs
WHERE location IS NOT NULL AND TRIM(location) <> ''
  AND department IS NOT NULL AND TRIM(department) <> '';
