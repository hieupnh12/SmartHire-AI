package com.smarthire.tenant.cv.github;

/** One GET to api.github.com. Implementations must not follow redirects. */
interface GithubHttp {
    record Response(int status, String body, String location, long retryAfterSeconds) {}

    Response get(String pathAndQuery, String accept);
}
