-- Existing MCQ answers retain selected_option_id for backward compatibility.
CREATE TABLE answer_selected_options (
    answer_id BIGINT NOT NULL,
    option_id BIGINT NOT NULL,
    PRIMARY KEY (answer_id, option_id),
    KEY idx_answer_selected_options_option (option_id),
    CONSTRAINT fk_aso_answer FOREIGN KEY (answer_id) REFERENCES answers (id) ON DELETE CASCADE,
    CONSTRAINT fk_aso_option FOREIGN KEY (option_id) REFERENCES options (id)
);
