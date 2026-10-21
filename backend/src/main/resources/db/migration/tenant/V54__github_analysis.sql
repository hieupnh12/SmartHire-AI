-- Public GitHub evidence for CV screening. Source code is not stored.
CREATE TABLE github_analyses (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    cv_id BIGINT NOT NULL,
    job_id BIGINT NOT NULL,
    status VARCHAR(32) NOT NULL,
    score DECIMAL(5,2) NULL,
    source_urls JSON NULL,
    result_json JSON NULL,
    error_code VARCHAR(64) NULL,
    error_message VARCHAR(512) NULL,
    strategy_version VARCHAR(32) NOT NULL,
    model_version VARCHAR(64) NULL,
    prompt_version VARCHAR(32) NULL,
    prompt_tokens INT NOT NULL DEFAULT 0,
    completion_tokens INT NOT NULL DEFAULT 0,
    github_requests INT NOT NULL DEFAULT 0,
    duration_ms INT NOT NULL DEFAULT 0,
    cache_hit BOOLEAN NOT NULL DEFAULT FALSE,
    analyzed_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uk_github_analyses_cv_job UNIQUE (cv_id, job_id),
    CONSTRAINT fk_github_analyses_cv FOREIGN KEY (cv_id) REFERENCES cvs (id) ON DELETE CASCADE,
    CONSTRAINT fk_github_analyses_job FOREIGN KEY (job_id) REFERENCES jobs (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_github_analyses_status ON github_analyses (status);

-- Reusable public-repo result for the same commit, skill set, and analysis strategy.
-- No foreign key: the row is not a candidate document and holds no source text.
CREATE TABLE github_repo_caches (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    repo_full_name VARCHAR(200) NOT NULL,
    commit_sha CHAR(40) NOT NULL,
    skill_fingerprint CHAR(64) NOT NULL,
    strategy_version VARCHAR(32) NOT NULL,
    model_version VARCHAR(64) NULL,
    selected_files_json JSON NOT NULL,
    result_json JSON NOT NULL,
    prompt_tokens INT NOT NULL DEFAULT 0,
    completion_tokens INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uk_github_repo_cache UNIQUE (repo_full_name, commit_sha, skill_fingerprint, strategy_version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_github_repo_cache_lookup
    ON github_repo_caches (repo_full_name, skill_fingerprint, strategy_version);
