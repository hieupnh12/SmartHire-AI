package com.smarthire.tenant.cv.github;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/** Limits for public GitHub analysis. The API host is fixed to api.github.com. */
@Component
public class GithubAnalysisSettings {
    private final boolean enabled;
    private final String token;
    private final int maxRepos;
    private final int maxFiles;
    private final int maxFileBytes;
    private final int maxTotalBytes;
    private final int maxPromptChars;
    private final int timeoutSeconds;
    private final int maxRetries;
    private final String strategyVersion;
    private final String promptVersion;

    public GithubAnalysisSettings(
            @Value("${app.github.enabled:true}") boolean enabled,
            @Value("${app.github.token:}") String token,
            @Value("${app.github.max-repos:2}") int maxRepos,
            @Value("${app.github.max-files:8}") int maxFiles,
            @Value("${app.github.max-file-bytes:12000}") int maxFileBytes,
            @Value("${app.github.max-total-bytes:48000}") int maxTotalBytes,
            @Value("${app.github.max-prompt-chars:60000}") int maxPromptChars,
            @Value("${app.github.timeout-seconds:12}") int timeoutSeconds,
            @Value("${app.github.max-retries:2}") int maxRetries,
            @Value("${app.github.strategy-version:github-v1}") String strategyVersion,
            @Value("${app.github.prompt-version:github-prompt-v1}") String promptVersion) {
        this.enabled = enabled;
        this.token = token == null ? "" : token;
        this.maxRepos = Math.max(1, maxRepos);
        this.maxFiles = Math.max(1, maxFiles);
        this.maxFileBytes = Math.max(256, maxFileBytes);
        this.maxTotalBytes = Math.max(this.maxFileBytes, maxTotalBytes);
        this.maxPromptChars = Math.max(2000, maxPromptChars);
        this.timeoutSeconds = Math.max(3, timeoutSeconds);
        this.maxRetries = Math.max(0, maxRetries);
        this.strategyVersion = strategyVersion == null || strategyVersion.isBlank() ? "github-v1" : strategyVersion;
        this.promptVersion = promptVersion == null || promptVersion.isBlank() ? "github-prompt-v1" : promptVersion;
    }

    public boolean enabled() { return enabled; }
    public String token() { return token; }
    public int maxRepos() { return maxRepos; }
    public int maxFiles() { return maxFiles; }
    public int maxFileBytes() { return maxFileBytes; }
    public int maxTotalBytes() { return maxTotalBytes; }
    public int maxPromptChars() { return maxPromptChars; }
    public int timeoutSeconds() { return timeoutSeconds; }
    public int maxRetries() { return maxRetries; }
    public String strategyVersion() { return strategyVersion; }
    public String promptVersion() { return promptVersion; }
}
