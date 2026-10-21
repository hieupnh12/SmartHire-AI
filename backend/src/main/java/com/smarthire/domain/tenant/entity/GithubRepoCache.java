package com.smarthire.domain.tenant.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Getter
@Setter
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "github_repo_caches")
public class GithubRepoCache extends BaseEntity {

    @Column(name = "repo_full_name", nullable = false, length = 200)
    String repoFullName;

    @Column(name = "commit_sha", nullable = false, length = 40)
    String commitSha;

    @Column(name = "skill_fingerprint", nullable = false, length = 64)
    String skillFingerprint;

    @Column(name = "strategy_version", nullable = false, length = 32)
    String strategyVersion;

    @Column(name = "model_version", length = 64)
    String modelVersion;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "selected_files_json", nullable = false, columnDefinition = "json")
    String selectedFilesJson;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "result_json", nullable = false, columnDefinition = "json")
    String resultJson;

    @Column(name = "prompt_tokens", nullable = false)
    int promptTokens;

    @Column(name = "completion_tokens", nullable = false)
    int completionTokens;
}
