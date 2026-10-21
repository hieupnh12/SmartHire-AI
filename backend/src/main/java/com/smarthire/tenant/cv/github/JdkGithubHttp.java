package com.smarthire.tenant.cv.github;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpTimeoutException;
import java.time.Duration;

/** Calls only https://api.github.com and refuses redirects. */
final class JdkGithubHttp implements GithubHttp {
    private final HttpClient http;
    private final String token;
    private final Duration timeout;

    JdkGithubHttp(String token, Duration timeout) {
        this.token = token == null ? "" : token.trim();
        this.timeout = timeout;
        this.http = HttpClient.newBuilder()
                .followRedirects(HttpClient.Redirect.NEVER)
                .connectTimeout(Duration.ofSeconds(5))
                .build();
    }

    @Override
    public Response get(String pathAndQuery, String accept) {
        URI uri = endpoint(pathAndQuery);
        HttpRequest.Builder builder = HttpRequest.newBuilder(uri)
                .timeout(timeout)
                .header("Accept", accept == null || accept.isBlank() ? "application/vnd.github+json" : accept)
                .header("User-Agent", "SmartHire-AI")
                .header("X-GitHub-Api-Version", "2022-11-28")
                .GET();
        if (!token.isBlank()) builder.header("Authorization", "Bearer " + token);
        try {
            HttpResponse<String> response = http.send(builder.build(), HttpResponse.BodyHandlers.ofString());
            if (response.body() != null && response.body().length() > 1_000_000) {
                throw new GithubApiException(0, "GITHUB_TOO_LARGE", "GitHub response exceeded 1 MB");
            }
            String location = response.headers().firstValue("Location").orElse(null);
            long retryAfter = response.headers().firstValue("Retry-After").map(JdkGithubHttp::retry).orElse(0L);
            return new Response(response.statusCode(), response.body() == null ? "" : response.body(), location, retryAfter);
        } catch (GithubApiException ex) {
            throw ex;
        } catch (HttpTimeoutException ex) {
            throw new GithubApiException(0, "GITHUB_TIMEOUT", "GitHub request timed out");
        } catch (IOException ex) {
            throw new GithubApiException(0, "GITHUB_TIMEOUT", "GitHub request failed");
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new GithubApiException(0, "GITHUB_TIMEOUT", "GitHub request interrupted");
        }
    }

    static URI endpoint(String pathAndQuery) {
        if (pathAndQuery == null || !pathAndQuery.startsWith("/") || pathAndQuery.contains("://")
                || pathAndQuery.startsWith("//") || pathAndQuery.contains("..")) {
            throw new GithubApiException(0, "GITHUB_REJECTED", "Rejected GitHub path");
        }
        URI uri = URI.create("https://api.github.com" + pathAndQuery);
        if (!"api.github.com".equalsIgnoreCase(uri.getHost()) || !"https".equalsIgnoreCase(uri.getScheme())) {
            throw new GithubApiException(0, "GITHUB_REJECTED", "Rejected GitHub host");
        }
        return uri;
    }

    private static long retry(String value) {
        try {
            return Math.max(0, Long.parseLong(value.trim()));
        } catch (NumberFormatException ex) {
            return 0;
        }
    }
}
