ALTER TABLE jobs
    ADD COLUMN ai_interview_available_from TIMESTAMP NULL AFTER ai_interview_question_count;
