ALTER TABLE interviews ADD COLUMN configuration_json JSON NULL;
CREATE INDEX idx_human_schedule_window ON interview_schedules (status, scheduled_start, scheduled_end);
CREATE INDEX idx_interview_participant_user ON interview_participants (user_id, interview_id);
