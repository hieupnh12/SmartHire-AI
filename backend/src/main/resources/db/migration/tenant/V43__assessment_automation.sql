ALTER TABLE jobs ADD COLUMN assessment_config_json JSON NULL;
ALTER TABLE tests
    ADD COLUMN assigned_application_id BIGINT NULL,
    ADD CONSTRAINT uk_tests_assigned_application UNIQUE (assigned_application_id),
    ADD CONSTRAINT fk_tests_assigned_application FOREIGN KEY (assigned_application_id) REFERENCES applications(id);
