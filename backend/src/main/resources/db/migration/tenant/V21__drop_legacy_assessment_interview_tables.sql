-- Retire V12 archives and their data. Current model FKs remain unchanged.
-- Drop children before parents; keep FOREIGN_KEY_CHECKS enabled so unexpected
-- incoming references stop the migration instead of leaving dangling FKs.
DROP TABLE IF EXISTS legacy_v12_interview_answer_analyses;
DROP TABLE IF EXISTS legacy_v12_interview_answers;
DROP TABLE IF EXISTS legacy_v12_interview_questions;
DROP TABLE IF EXISTS legacy_v12_interview_scores;
DROP TABLE IF EXISTS legacy_v12_interview_feedbacks;
DROP TABLE IF EXISTS legacy_v12_interview_schedules;
DROP TABLE IF EXISTS legacy_v12_interviews;
DROP TABLE IF EXISTS legacy_v12_attempt_scores;
DROP TABLE IF EXISTS legacy_v12_attempt_answers;
DROP TABLE IF EXISTS legacy_v12_coding_submissions;
DROP TABLE IF EXISTS legacy_v12_proctor_events;
DROP TABLE IF EXISTS legacy_v12_proctor_reports;
DROP TABLE IF EXISTS legacy_v12_attempts;
DROP TABLE IF EXISTS legacy_v12_question_options;
DROP TABLE IF EXISTS legacy_v12_test_cases;
DROP TABLE IF EXISTS legacy_v12_coding_problems;
DROP TABLE IF EXISTS legacy_v12_questions;
DROP TABLE IF EXISTS legacy_v12_assessments;
DROP TABLE IF EXISTS legacy_v12_practice_feedbacks;

-- These IDs reference discarded historical rows, not current model IDs.
-- Conditional DDL permits retry after a partially completed MySQL migration.
SET @drop_legacy_attempt = IF(EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'ranking_sources'
      AND column_name = 'legacy_attempt_id'
), 'ALTER TABLE ranking_sources DROP COLUMN legacy_attempt_id', 'SELECT 1');
PREPARE legacy_cleanup FROM @drop_legacy_attempt;
EXECUTE legacy_cleanup;
DEALLOCATE PREPARE legacy_cleanup;

SET @drop_legacy_interview = IF(EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'ranking_sources'
      AND column_name = 'legacy_interview_id'
), 'ALTER TABLE ranking_sources DROP COLUMN legacy_interview_id', 'SELECT 1');
PREPARE legacy_cleanup FROM @drop_legacy_interview;
EXECUTE legacy_cleanup;
DEALLOCATE PREPARE legacy_cleanup;
