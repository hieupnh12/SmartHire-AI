package com.smarthire.tenant.cv.github;

/** GitHub API failure. {@code status} 0 means timeout or a refused connection. */
public class GithubApiException extends RuntimeException {
    private final int status;
    private final String code;

    public GithubApiException(int status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }

    public int status() { return status; }
    public String code() { return code; }
}
