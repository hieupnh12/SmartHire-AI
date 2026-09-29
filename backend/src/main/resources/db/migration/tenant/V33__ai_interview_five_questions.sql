-- AI Interview rounds use exactly 5 generated questions.
ALTER TABLE jobs ALTER COLUMN ai_interview_question_count SET DEFAULT 5;
UPDATE jobs SET ai_interview_question_count = 5 WHERE ai_interview_question_count <> 5;
