package com.smarthire.tenant.cv.github;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class RestGithubApiClient implements GithubApiClient {
    private static final String JSON = "application/vnd.github+json";
    private static final String RAW = "application/vnd.github.raw";

    private final GithubHttp http;
    private final ObjectMapper mapper;
    private final int maxRetries;
    private final int maxFileBytes;
    private final Sleeper sleeper;
    private final ThreadLocal<int[]> requests = ThreadLocal.withInitial(() -> new int[1]);

    @Autowired
    public RestGithubApiClient(GithubAnalysisSettings settings, ObjectMapper mapper) {
        this(new JdkGithubHttp(settings.token(), Duration.ofSeconds(settings.timeoutSeconds())),
                mapper, settings.maxRetries(), settings.maxFileBytes(), millis -> {
                    try {
                        Thread.sleep(millis);
                    } catch (InterruptedException ex) {
                        Thread.currentThread().interrupt();
                    }
                });
    }

    RestGithubApiClient(GithubHttp http, ObjectMapper mapper, int maxRetries, int maxFileBytes, Sleeper sleeper) {
        this.http = http;
        this.mapper = mapper;
        this.maxRetries = Math.max(0, maxRetries);
        this.maxFileBytes = maxFileBytes;
        this.sleeper = sleeper;
    }

    @Override
    public RepoSnapshot repository(String owner, String repo) {
        JsonNode body = json(get("/repos/" + seg(owner) + "/" + seg(repo), JSON));
        if (body.path("private").asBoolean(false)) {
            return snapshot(body, "");
        }
        String branch = text(body, "default_branch", "main");
        JsonNode commit = json(get("/repos/" + seg(owner) + "/" + seg(repo) + "/branches/" + seg(branch), JSON));
        return snapshot(body, commit.path("commit").path("sha").asText(""));
    }

    @Override
    public List<RepoSnapshot> listRepositories(String owner, int limit) {
        int page = Math.min(10, Math.max(1, limit));
        JsonNode body = json(get("/users/" + seg(owner) + "/repos?per_page=" + page + "&sort=updated&type=owner", JSON));
        List<RepoSnapshot> repos = new ArrayList<>();
        if (!body.isArray()) return repos;
        for (JsonNode node : body) {
            if (node.path("private").asBoolean(false)) continue;
            repos.add(snapshot(node, ""));
        }
        return repos;
    }

    @Override
    public String readme(String owner, String repo, String ref) {
        try {
            return cap(get("/repos/" + seg(owner) + "/" + seg(repo) + "/readme?ref=" + seg(ref), RAW));
        } catch (GithubApiException ex) {
            if (ex.status() == 404) return "";
            throw ex;
        }
    }

    @Override
    public TreePage tree(String owner, String repo, String sha) {
        JsonNode body = json(get("/repos/" + seg(owner) + "/" + seg(repo) + "/git/trees/" + seg(sha) + "?recursive=1", JSON));
        List<TreeItem> items = new ArrayList<>();
        for (JsonNode node : body.path("tree")) {
            if (!"blob".equals(node.path("type").asText())) continue;
            items.add(new TreeItem(node.path("path").asText(""), node.path("sha").asText(""), node.path("size").asLong(0), "blob"));
        }
        return new TreePage(items, body.path("truncated").asBoolean(false));
    }

    @Override
    public String fileText(String owner, String repo, String path, String ref) {
        return cap(get("/repos/" + seg(owner) + "/" + seg(repo) + "/contents/" + encodePath(path) + "?ref=" + seg(ref), RAW));
    }

    @Override
    public CompareResult compare(String owner, String repo, String base, String head) {
        JsonNode body = json(get("/repos/" + seg(owner) + "/" + seg(repo) + "/compare/" + seg(base) + "..." + seg(head), JSON));
        List<String> paths = new ArrayList<>();
        for (JsonNode file : body.path("files")) {
            String name = file.path("filename").asText("");
            if (!name.isBlank()) paths.add(name);
        }
        return new CompareResult(paths);
    }

    @Override
    public void resetRequests() { requests.get()[0] = 0; }

    @Override
    public int requestsMade() { return requests.get()[0]; }

    private String get(String path, String accept) {
        GithubApiException last = null;
        int attempts = maxRetries + 1;
        for (int i = 0; i < attempts; i++) {
            requests.get()[0]++;
            GithubHttp.Response response;
            try {
                response = http.get(path, accept);
            } catch (GithubApiException ex) {
                if (ex.status() == 0 && i < attempts - 1) {
                    sleeper.sleep(200L);
                    continue;
                }
                throw ex;
            }
            int status = response.status();
            if (status >= 300 && status < 400) {
                throw new GithubApiException(status, "GITHUB_REDIRECT", "Refused a GitHub redirect");
            }
            if (status == 403 && rateLimited(response.body())) status = 429;
            if (status == 429 || status >= 500) {
                last = new GithubApiException(status == 429 ? 429 : status, status == 429 ? "GITHUB_429" : "GITHUB_ERROR",
                        "GitHub status " + status);
                if (i < attempts - 1) {
                    sleeper.sleep(Math.min(2_000L, Math.max(200L, response.retryAfterSeconds() * 1000)));
                    continue;
                }
                throw last;
            }
            if (status == 403) throw new GithubApiException(403, "GITHUB_403", "GitHub forbidden");
            if (status == 404) throw new GithubApiException(404, "GITHUB_404", "GitHub resource not found");
            if (status >= 400) throw new GithubApiException(status, "GITHUB_ERROR", "GitHub status " + status);
            return response.body();
        }
        throw last == null ? new GithubApiException(0, "GITHUB_ERROR", "GitHub request failed") : last;
    }

    private JsonNode json(String body) {
        try {
            return mapper.readTree(body == null || body.isBlank() ? "{}" : body);
        } catch (Exception ex) {
            throw new GithubApiException(0, "GITHUB_ERROR", "GitHub returned invalid JSON");
        }
    }

    private RepoSnapshot snapshot(JsonNode body, String sha) {
        String full = text(body, "full_name", "");
        String owner = full.contains("/") ? full.substring(0, full.indexOf('/')) : text(body, "owner", "");
        if (owner.isBlank() && body.path("owner").isObject()) owner = body.path("owner").path("login").asText("");
        String name = text(body, "name", full.contains("/") ? full.substring(full.indexOf('/') + 1) : full);
        return new RepoSnapshot(full, owner, name, text(body, "description", ""), text(body, "default_branch", "main"),
                sha, text(body, "language", ""), text(body, "html_url", "https://github.com/" + full),
                body.path("fork").asBoolean(false), body.path("private").asBoolean(false), body.path("archived").asBoolean(false));
    }

    private String cap(String text) {
        return GithubText.cap(text, maxFileBytes);
    }

    private static boolean rateLimited(String body) {
        if (body == null) return false;
        String lower = body.toLowerCase();
        return lower.contains("rate limit") || lower.contains("secondary rate");
    }

    private static String text(JsonNode node, String field, String fallback) {
        String value = node.path(field).asText("");
        return value.isBlank() ? fallback : value;
    }

    static String seg(String value) {
        if (value == null || value.isBlank() || value.contains("/") || value.contains("..") || value.contains("://")) {
            throw new GithubApiException(0, "GITHUB_REJECTED", "Rejected GitHub path segment");
        }
        return URLEncoder.encode(value, StandardCharsets.UTF_8).replace("+", "%20");
    }

    static String encodePath(String path) {
        if (path == null || path.isBlank() || path.startsWith("/") || path.contains("..") || path.contains("://")) {
            throw new GithubApiException(0, "GITHUB_REJECTED", "Rejected file path");
        }
        String[] parts = path.split("/");
        StringBuilder encoded = new StringBuilder();
        for (String part : parts) {
            if (part.isBlank()) continue;
            if (!encoded.isEmpty()) encoded.append('/');
            encoded.append(URLEncoder.encode(part, StandardCharsets.UTF_8).replace("+", "%20"));
        }
        return encoded.toString();
    }

    interface Sleeper { void sleep(long millis); }
}
