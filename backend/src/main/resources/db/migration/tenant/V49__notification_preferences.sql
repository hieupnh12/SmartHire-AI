CREATE TABLE notification_preferences (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    category VARCHAR(32) NOT NULL,
    web_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uk_notification_preference_user_category UNIQUE (user_id, category),
    CONSTRAINT fk_notification_preference_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
