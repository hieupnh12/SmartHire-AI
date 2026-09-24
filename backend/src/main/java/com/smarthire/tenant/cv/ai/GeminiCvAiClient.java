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
            screening{score 0-100, verdict, matched[{requirement,evidence}], missing[{requirement,reason}]}.
            Do not invent experience or skills. Empty arrays mean not found. Dates must be YYYY-MM.
            screening.score is how well this CV fits the job requirements (not a ranking after assessment/interview).
            A CV that lacks the job's required skills must score low. Verdict is 2-4 sentences for the recruiter, Vietnamese preferred.
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

    private String getEffectiveProvider() {
        if (configProvider != null) {
            String p = configProvider.resolveConfig("CV_PARSING").provider();
            if (p != null && !p.isBlank()) return p.toUpperCase();
        }
        return "GEMINI";
    }

    private String getEffectiveEndpoint() {
        if (configProvider != null) {
            return configProvider.resolveConfig("CV_PARSING").endpointUrl();
        }
        return null;
    }

    @Override
    public String extractJson(String rawText, String jobContext) {
        String apiKey = getEffectiveApiKey();
        String model = getEffectiveModel();
        String provider = getEffectiveProvider();
        if (apiKey == null || apiKey.isBlank()) return fallback.extractJson(rawText, jobContext);
        try {
            String promptText = prompt(rawText, jobContext);
            String text;

            if ("OPENAI".equalsIgnoreCase(provider) || "DEEPSEEK".equalsIgnoreCase(provider)) {
                String defaultEndpoint = "DEEPSEEK".equalsIgnoreCase(provider)
                        ? "https://api.deepseek.com/chat/completions"
                        : "https://api.openai.com/v1/chat/completions";
                String endpoint = getEffectiveEndpoint();
                String url = (endpoint != null && !endpoint.isBlank()) ? endpoint.trim() : defaultEndpoint;

                String body = """
                        {
                          "model": %s,
                          "messages": [
                            {"role": "system", "content": %s},
                            {"role": "user", "content": %s}
                          ],
                          "response_format": {"type": "json_object"}
                        }
                        """.formatted(
                                mapper.writeValueAsString(model),
                                mapper.writeValueAsString(INSTRUCTION),
                                mapper.writeValueAsString(promptText)
                        );

                String response = http.post()
                        .uri(url)
                        .header("Authorization", "Bearer " + apiKey.trim())
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(body)
                        .retrieve()
                        .body(String.class);

                text = readOpenAiText(response);
            } else {
                String body = """
                        {"contents":[{"parts":[{"text":%s}]}]}
                        """.formatted(mapper.writeValueAsString(promptText));
                String response = http.post()
                        .uri("https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}",
                                model, apiKey.trim())
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(body)
                        .retrieve()
                        .body(String.class);
                text = readText(response);
            }

            int start = text.indexOf('{');
            int end = text.lastIndexOf('}');
            if (start < 0 || end <= start) throw new IllegalStateException("AI returned no JSON");
            String json = text.substring(start, end + 1);
            mapper.readTree(json);
            return json;
        } catch (Exception ex) {
            log.error("AI extraction failed (provider={}): {}", provider, ex.getMessage());
            throw new IllegalStateException("AI CV extraction failed", ex);
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

    private String readOpenAiText(String response) throws Exception {
        JsonNode root = mapper.readTree(response);
        JsonNode content = root.path("choices").path(0).path("message").path("content");
        return content.isMissingNode() ? "" : content.asText();
    }

    private static String truncate(String text) {
        if (text == null) return "";
        return text.length() <= 20_000 ? text : text.substring(0, 20_000);
    }

    @Override
    public String modelVersion() {
        String apiKey = getEffectiveApiKey();
        String model = getEffectiveModel();
        String provider = getEffectiveProvider();
        return (apiKey == null || apiKey.isBlank()) ? fallback.modelVersion() : provider.toLowerCase() + ":" + model;
    }

    @Override
    public String promptVersion() {
        String apiKey = getEffectiveApiKey();
        return (apiKey == null || apiKey.isBlank()) ? fallback.promptVersion() : "screen-v1-job";
    }
}
