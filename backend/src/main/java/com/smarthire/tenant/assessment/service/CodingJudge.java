package com.smarthire.tenant.assessment.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.smarthire.domain.tenant.entity.CodingProblem;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.net.URI;
import java.util.HashMap;
import java.util.Map;

@Component
public class CodingJudge {
    private final RestClient http;
    private final String url;
    private final String token;
    private final String host;

    @Autowired
    public CodingJudge(
            @Value("${app.assessment.judge-url:}") String url,
            @Value("${app.assessment.judge-token:}") String token,
            @Value("${app.assessment.judge-rapidapi-host:}") String rapidApiHost) {
        this(url, token, rapidApiHost, null);
    }

    public CodingJudge(String url, String token) {
        this(url, token, "", null);
    }

    public CodingJudge(String url, String token, String rapidApiHost, RestClient customClient) {
        this.url = url != null ? url.trim() : "";
        this.token = token != null ? token.trim() : "";
        this.host = rapidApiHost != null && !rapidApiHost.isBlank() ? rapidApiHost.trim() : extractHost(this.url);

        if (customClient != null) {
            this.http = customClient;
        } else {
            var factory = new SimpleClientHttpRequestFactory();
            factory.setConnectTimeout(5000);
            factory.setReadTimeout(30000);

            var builder = RestClient.builder().requestFactory(factory);

            if (!this.token.isBlank()) {
                builder.defaultHeader("X-Auth-Token", this.token);
                if (isRapidApi(this.url, this.host)) {
                    builder.defaultHeader("x-rapidapi-key", this.token);
                    if (!this.host.isBlank()) {
                        builder.defaultHeader("x-rapidapi-host", this.host);
                    }
                }
            }
            this.http = builder.build();
        }
    }

    public JsonNode run(CodingProblem problem, String language, String source, String input, String expected) {
        if (url.isBlank()) {
            throw new IllegalStateException("Coding sandbox is not configured");
        }
        if (isRapidApi(url, host) && token.isBlank()) {
            throw new IllegalStateException("RapidAPI key is not configured (APP_ASSESSMENT_JUDGE_TOKEN)");
        }
        int languageId = switch (language) {
            case "java" -> 62;
            case "python" -> 71;
            case "javascript" -> 63;
            case "sql" -> 82;
            case "cpp" -> 54;
            default -> throw new IllegalArgumentException("Unsupported language");
        };
        String harness = problem.getHarnessJson().path(language).asText();
        if (!harness.contains("{{SOURCE}}")) {
            throw new IllegalStateException("Missing executable harness");
        }

        Map<String, Object> body = new HashMap<>();
        body.put("source_code", harness.replace("{{SOURCE}}", source));
        body.put("language_id", languageId);
        body.put("stdin", input != null ? input : "");
        body.put("expected_output", expected != null ? expected : "");
        body.put("cpu_time_limit", problem.getTimeLimitMs() / 1000.0);
        body.put("wall_time_limit", 15);
        body.put("memory_limit", problem.getMemoryMb() * 1024);
        body.put("enable_network", false);
        body.put("max_file_size", 1024);

        return http.post()
                .uri(url.replaceAll("/+$", "") + "/submissions?base64_encoded=false&wait=true")
                .body(body)
                .retrieve()
                .body(JsonNode.class);
    }

    private static boolean isRapidApi(String url, String host) {
        return (url != null && url.toLowerCase().contains("rapidapi.com"))
                || (host != null && host.toLowerCase().contains("rapidapi.com"));
    }

    private static String extractHost(String rawUrl) {
        if (rawUrl == null || rawUrl.isBlank()) return "";
        try {
            URI uri = URI.create(rawUrl);
            return uri.getHost() != null ? uri.getHost() : "";
        } catch (Exception e) {
            return "";
        }
    }

    public String getUrl() { return url; }
    public String getHost() { return host; }
    public boolean isRapidApi() { return isRapidApi(url, host); }
}
