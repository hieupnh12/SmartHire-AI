-- Authoring aids for coding problems: constraints text and per-case explanations (samples).
ALTER TABLE coding_problems
    ADD COLUMN constraints_text TEXT NULL;

ALTER TABLE test_cases
    ADD COLUMN explanation TEXT NULL;
