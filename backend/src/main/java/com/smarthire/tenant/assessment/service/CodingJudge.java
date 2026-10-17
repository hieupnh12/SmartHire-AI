package com.smarthire.tenant.assessment.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.smarthire.domain.tenant.entity.CodingProblem;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import java.util.Map;

@Component
public class CodingJudge {
    private final RestClient http;
    private final String url;
    public CodingJudge(@Value("${app.assessment.judge-url:}") String url,
            @Value("${app.assessment.judge-token:}") String token) {
        this.url = url;
        var factory = new SimpleClientHttpRequestFactory(); factory.setConnectTimeout(5000); factory.setReadTimeout(30000);
        http = RestClient.builder().requestFactory(factory).defaultHeader("X-Auth-Token", token).build();
    }
    public JsonNode run(CodingProblem problem, String language, String source, String input, String expected) {
        if (url.isBlank()) throw new IllegalStateException("Coding sandbox is not configured");
        int languageId = switch (language) { case "java" -> 62; case "python" -> 71; case "javascript" -> 63; case "sql" -> 82; case "cpp" -> 54; default -> throw new IllegalArgumentException("Unsupported language"); };
        String harness = problem.getHarnessJson().path(language).asText();
        if (!harness.contains("{{SOURCE}}")) throw new IllegalStateException("Missing executable harness");
        var body = Map.of("source_code", harness.replace("{{SOURCE}}", source), "language_id", languageId,
                "stdin", input, "expected_output", expected, "cpu_time_limit", problem.getTimeLimitMs() / 1000.0,
                "wall_time_limit", 15, "memory_limit", problem.getMemoryMb() * 1024, "enable_network", false,
                "max_file_size", 1024);
        return http.post().uri(url.replaceAll("/+$", "") + "/submissions?base64_encoded=false&wait=true")
                .body(body).retrieve().body(JsonNode.class);
    }
}
