package com.smarthire.tenant.cv.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Duration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import com.smarthire.config.ai.DynamicAiConfigProvider;
import org.springframework.beans.factory.annotation.Autowired;

/** Gemini JSON extraction with heuristic fallback and dynamic AI config support. */
@Component
@Primary
public class GeminiCvAiClient implements CvAiClient {
    private static final Logger log = LoggerFactory.getLogger(GeminiCvAiClient.class);
    static final String INSTRUCTION = """
            Extract a JSON object from this CV for recruiter screening against ONE job. Return JSON only with keys:
            contact{email,phone,name}, education[], experience[{startDate YYYY-MM,endDate,current,skills[],evidence}],
            projects[], languages[], certifications[], skills[{name,confidence}],
            screening{verdict, matched[{requirement,status,evidence,explanation}],
            partial[{requirement,status,evidence,explanation}], missing[{requirement,status,evidence}]}.
            status must be MATCH, PARTIAL, MISSING, or UNKNOWN. Do not invent experience or skills.
            If the CV has no information about a requirement, use MISSING or UNKNOWN — never guess.
            MATCH only when the CV clearly supports the requirement. PARTIAL when related but incomplete.
            Evidence must be a short quote or paraphrase from the CV text. Empty arrays mean not found.
            Dates must be YYYY-MM. Do not output an overall score; the backend computes the score.
            Verdict is 2-4 sentences for the recruiter, Vietnamese preferred.
            """;

    private final HeuristicCvAiClient fallback;
    private final ObjectMapper mapper;
    private final String defaultApiKey;
    private final String defaultModel;
    private final int timeoutSeconds;
    private final RestClient http;
    private DynamicAiConfigProvider configProvider;

    public GeminiCvAiClient(
            HeuristicCvAiClient fallback,
            ObjectMapper mapper,
            @Value("${app.ai.gemini.api-key:}") String apiKey,
            @Value("${app.ai.models.cv-parsing:gemini-2.0-flash}") String model,
            @Value("${app.ai.timeout-seconds:30}") int timeoutSeconds) {
        this.fallback = fallback;
        this.mapper = mapper;
        this.defaultApiKey = apiKey == null ? "" : apiKey.trim();
        this.defaultModel = model;
        this.timeoutSeconds = timeoutSeconds;
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(5));
        factory.setReadTimeout(Duration.ofSeconds(Math.max(5, timeoutSeconds)));
        this.http = RestClient.builder().requestFactory(factory).build();
    }

    @Autowired(required = false)
    public void setConfigProvider(DynamicAiConfigProvider configProvider) {
        this.configProvider = configProvider;
    }

    private String getEffectiveApiKey() {
        if (configProvider != null) {
            String key = configProvider.resolveConfig("CV_PARSING").apiKey();
            if (key != null && !key.isBlank()) return key;
        }
        return defaultApiKey;
    }

    private String getEffectiveModel() {
        if (configProvider != null) {
            String model = configProvider.resolveConfig("CV_PARSING").modelName();
            if (model != null && !model.isBlank()) return model;
        }
        return defaultModel;
    }

    @Override
    public String extractJson(String rawText, String jobContext) {
        String apiKey = getEffectiveApiKey();
        String model = getEffectiveModel();
        if (apiKey == null || apiKey.isBlank()) return fallback.extractJson(rawText, jobContext);
        try {
            String body = """
                    {"contents":[{"parts":[{"text":%s}]}]}
                    """.formatted(mapper.writeValueAsString(prompt(rawText, jobContext)));
            String response = http.post()
                    .uri("https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}",
                            model, apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(String.class);
            String text = readText(response);
            int start = text.indexOf('{');
            int end = text.lastIndexOf('}');
            if (start < 0 || end <= start) throw new IllegalStateException("Gemini returned no JSON");
            String json = text.substring(start, end + 1);
            mapper.readTree(json);
            return json;
        } catch (Exception ex) {
            log.error("Gemini extraction failed, falling back to heuristic: {}", ex.getMessage());
            return tagHeuristic(fallback.extractJson(rawText, jobContext));
        }
    }

    static String prompt(String rawText, String jobContext) {
        String job = jobContext == null || jobContext.isBlank()
                ? "No job context."
                : "Job to screen against:\n" + jobContext.trim();
        return INSTRUCTION + "\n\n" + job + "\n\nCV text:\n" + truncate(rawText);
    }

    private String readText(String response) throws Exception {
        JsonNode root = mapper.readTree(response);
        JsonNode text = root.path("candidates").path(0).path("content").path("parts").path(0).path("text");
        return text.isMissingNode() ? "" : text.asText();
    }

    private static String truncate(String text) {
        if (text == null) return "";
        return text.length() <= 20_000 ? text : text.substring(0, 20_000);
    }

    @Override
    public String modelVersion() {
        String apiKey = getEffectiveApiKey();
        String model = getEffectiveModel();
        return (apiKey == null || apiKey.isBlank()) ? fallback.modelVersion() : "gemini:" + model;
    }

    @Override
    public String promptVersion() {
        String apiKey = getEffectiveApiKey();
        return (apiKey == null || apiKey.isBlank()) ? fallback.promptVersion() : "screen-v2-hybrid";
    }

    @Override
    public String modelVersionFor(String json) {
        return taggedHeuristic(json) ? fallback.modelVersion() : modelVersion();
    }

    @Override
    public String promptVersionFor(String json) {
        return taggedHeuristic(json) ? fallback.promptVersion() : promptVersion();
    }

    private String tagHeuristic(String json) {
        try {
            var root = mapper.readTree(json);
            if (root instanceof com.fasterxml.jackson.databind.node.ObjectNode object) {
                object.put("extractor", HeuristicCvAiClient.MODEL);
                return object.toString();
            }
        } catch (Exception ignored) {
            // Return untagged heuristic JSON.
        }
        return json;
    }

    private boolean taggedHeuristic(String json) {
        try {
            return HeuristicCvAiClient.MODEL.equals(mapper.readTree(json == null ? "{}" : json).path("extractor").asText());
        } catch (Exception ex) {
            return false;
        }
    }
}
