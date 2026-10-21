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

import com.smarthire.common.exception.BusinessException;
import com.smarthire.config.ai.AiRateLimiterService;
import com.smarthire.config.ai.AiUsageMeteringService;
import com.smarthire.config.ai.DynamicAiConfigProvider;
import org.springframework.beans.factory.annotation.Autowired;

/** Gemini JSON extraction with heuristic fallback and dynamic AI config support. */
@Component
@Primary
public class GeminiCvAiClient implements CvAiClient {
    private static final Logger log = LoggerFactory.getLogger(GeminiCvAiClient.class);
    static final String INSTRUCTION = """
            Extract a JSON object from this CV for recruiter screening against ONE job. Return JSON only with keys:
            contact{email,phone,name}, education[{degree,school,startDate,endDate}],
            experience[{title,company,startDate YYYY-MM,endDate,current,skills[],evidence}],
            projects[{name,description}], languages[{name,level}], certifications[{name,issuer,date}], skills[{name,confidence}],
            screening{verdict, matched[{requirement,status,evidence,explanation}],
            partial[{requirement,status,evidence,explanation}], missing[{requirement,status,evidence}]}.
            status must be MATCH, PARTIAL, MISSING, or UNKNOWN. Do not invent experience or skills.
            If the CV has no information about a requirement, use MISSING or UNKNOWN — never guess.
            MATCH only when the CV clearly supports the requirement. PARTIAL when related but incomplete.
            Evidence must be a short quote or paraphrase from the CV text. Empty arrays mean not found.
            Write verdict, explanation, and evidence sentences in Vietnamese. Keep skill names and direct CV quotes unchanged.
            Do not write English sentences such as "No X experience found in the CV."
            Dates must be YYYY-MM. Do not output an overall score; the backend computes the score.
            Verdict is 2-4 sentences for the recruiter.
            """;

    private final HeuristicCvAiClient fallback;
    private final ObjectMapper mapper;
    private final int timeoutSeconds;
    private final RestClient http;
    private DynamicAiConfigProvider configProvider;
    private AiUsageMeteringService meteringService;
    private AiRateLimiterService rateLimiterService;

    public GeminiCvAiClient(
            HeuristicCvAiClient fallback,
            ObjectMapper mapper,
            @Value("${app.ai.timeout-seconds:30}") int timeoutSeconds) {
        this.fallback = fallback;
        this.mapper = mapper;
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

    @Autowired(required = false)
    public void setMeteringService(AiUsageMeteringService meteringService) {
        this.meteringService = meteringService;
    }

    @Autowired(required = false)
    public void setRateLimiterService(AiRateLimiterService rateLimiterService) {
        this.rateLimiterService = rateLimiterService;
    }

    private String getEffectiveApiKey() {
        if (configProvider != null) {
            String key = configProvider.resolveConfig("CV_PARSING").apiKey();
            if (key != null && !key.isBlank()) return key;
        }
        return "";
    }

    private String getEffectiveModel() {
        if (configProvider != null) {
            String model = configProvider.resolveConfig("CV_PARSING").modelName();
            if (model != null && !model.isBlank()) return model;
        }
        return "";
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
        if (!configured()) return fallback.extractJson(rawText, jobContext);
        try {
            return completeJson(INSTRUCTION, prompt(rawText, jobContext));
        } catch (BusinessException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("AI extraction failed (provider={}), falling back to heuristic: {}", getEffectiveProvider(), ex.getMessage());
            return tagHeuristic(fallback.extractJson(rawText, jobContext));
        }
    }

    public boolean configured() {
        return !getEffectiveApiKey().isBlank() && !getEffectiveModel().isBlank();
    }

    private DynamicAiConfigProvider.ResolvedAiConfig resolvePrimaryConfig() {
        if (configProvider != null) {
            var resolved = configProvider.resolveConfig("CV_PARSING");
            if (resolved != null) {
                return resolved;
            }
        }
        return new DynamicAiConfigProvider.ResolvedAiConfig(
                "CV_PARSING", null, null, "", null, null, 4096, timeoutSeconds, null, null);
    }

    private java.util.Optional<DynamicAiConfigProvider.ResolvedAiConfig> resolveFailoverTarget(
            DynamicAiConfigProvider.ResolvedAiConfig primary) {
        if (primary == null || !primary.hasFailover()) {
            return java.util.Optional.empty();
        }
        if (configProvider != null) {
            var resolved = configProvider.resolveFailoverConfig(primary);
            if (resolved.isPresent()) {
                return resolved;
            }
        }
        String targetProvider = (primary.failoverProvider() == null || primary.failoverProvider().isBlank())
                ? primary.provider()
                : primary.failoverProvider().trim().toUpperCase();
        if (targetProvider != null
                && targetProvider.equalsIgnoreCase(primary.provider())
                && primary.apiKey() != null
                && !primary.apiKey().isBlank()) {
            return java.util.Optional.of(new DynamicAiConfigProvider.ResolvedAiConfig(
                    primary.taskType(),
                    targetProvider,
                    primary.failoverModel().trim(),
                    primary.apiKey(),
                    primary.endpointUrl(),
                    primary.temperature(),
                    primary.maxTokens(),
                    primary.timeoutSeconds(),
                    null,
                    null));
        }
        return java.util.Optional.empty();
    }

    private java.util.List<DynamicAiConfigProvider.ResolvedAiConfig> getExecutionChain(String taskType) {
        String task = taskType == null || taskType.isBlank() ? "CV_PARSING" : taskType.trim().toUpperCase();
        if (configProvider == null) {
            return java.util.List.of(resolvePrimaryConfig());
        }
        var chain = configProvider.resolveExecutionChain(task);
        if (!usable(chain) && !"CV_PARSING".equals(task)) {
            chain = configProvider.resolveExecutionChain("CV_PARSING");
        }
        if (chain != null && !chain.isEmpty()) {
            return chain;
        }
        var primary = resolvePrimaryConfig();
        java.util.List<DynamicAiConfigProvider.ResolvedAiConfig> list = new java.util.ArrayList<>();
        list.add(primary);
        resolveFailoverTarget(primary).ifPresent(list::add);
        return list;
    }

    private static boolean usable(java.util.List<DynamicAiConfigProvider.ResolvedAiConfig> chain) {
        if (chain == null) return false;
        return chain.stream().anyMatch(item -> item.apiKey() != null && !item.apiKey().isBlank()
                && item.modelName() != null && !item.modelName().isBlank());
    }

    /** Model label for cache keys. Does not hard-code a model name. */
    public String modelLabel(String taskType) {
        for (var target : getExecutionChain(taskType)) {
            if (target.apiKey() != null && !target.apiKey().isBlank()
                    && target.modelName() != null && !target.modelName().isBlank()) {
                String provider = target.provider() == null || target.provider().isBlank() ? "GEMINI" : target.provider();
                return provider.toLowerCase() + ":" + target.modelName();
            }
        }
        return "unconfigured";
    }

    public record AiJsonCompletion(String json, long promptTokens, long completionTokens, String provider, String model) {}

    /** Sends one JSON-mode request; {@code system} is only used by OpenAI-compatible providers, Gemini gets {@code promptText}. */
    public String completeJson(String system, String promptText) throws Exception {
        return completeForTask("CV_PARSING", system, promptText).json();
    }

    public AiJsonCompletion completeForTask(String taskType, String system, String promptText) throws Exception {
        String task = taskType == null || taskType.isBlank() ? "CV_PARSING" : taskType.trim().toUpperCase();
        var chain = getExecutionChain(task);
        if (chain.isEmpty()) {
            throw new IllegalStateException("AI provider is not configured");
        }

        Exception lastException = null;
        for (int i = 0; i < chain.size(); i++) {
            var target = chain.get(i);
            String apiKey = target.apiKey() == null ? "" : target.apiKey();
            if (apiKey.isBlank() || target.modelName() == null || target.modelName().isBlank()) {
                log.warn("Skipping AI target {}:{} for {} because its model or API key is not configured",
                        target.provider(), target.modelName(), task);
                continue;
            }

            if (rateLimiterService != null) {
                rateLimiterService.checkAndAcquire(task);
            }

            try {
                return executeCompleteJson(
                        task,
                        target.provider() == null || target.provider().isBlank() ? "GEMINI" : target.provider().toUpperCase(),
                        target.modelName(),
                        apiKey,
                        target.endpointUrl(),
                        system,
                        promptText);
            } catch (BusinessException ex) {
                throw ex;
            } catch (Exception ex) {
                lastException = ex;
                String errorMsg = ex.getMessage() != null ? ex.getMessage() : "";
                boolean is429 = errorMsg.contains("429") || errorMsg.contains("RESOURCE_EXHAUSTED") || errorMsg.contains("Too Many Requests");
                if (ex instanceof org.springframework.web.client.RestClientResponseException rre && rre.getStatusCode().value() == 429) {
                    is429 = true;
                }
                if (is429 && configProvider != null) {
                    configProvider.markModelCooldown(target.provider(), target.modelName(), java.time.Duration.ofSeconds(60));
                }

                if (i < chain.size() - 1) {
                    var next = chain.get(i + 1);
                    log.warn("AI model {}:{} failed for {} ({}), cascading to next fallback {}:{}",
                            target.provider(), target.modelName(), task, ex.getMessage(),
                            next.provider(), next.modelName());
                } else {
                    log.warn("AI model {}:{} failed for {} ({}), no more models in fallback chain",
                            target.provider(), target.modelName(), task, ex.getMessage());
                }
            }
        }

        if (lastException != null) {
            throw lastException;
        }
        throw new IllegalStateException("No valid AI provider available in execution chain for " + task);
    }

    private AiJsonCompletion executeCompleteJson(
            String taskType,
            String provider,
            String model,
            String apiKey,
            String endpoint,
            String system,
            String promptText) throws Exception {
        String text;
        String rawResponse = null;
        long startNs = System.nanoTime();
        boolean success = false;
        long promptTokens = 0L;
        long completionTokens = 0L;

        try {
            boolean isOpenAiCompatible = !"GEMINI".equalsIgnoreCase(provider) && !"ANTHROPIC".equalsIgnoreCase(provider);
            if (isOpenAiCompatible) {
                String defaultEndpoint = switch (provider != null ? provider.toUpperCase() : "OPENAI") {
                    case "DEEPSEEK" -> "https://api.deepseek.com/chat/completions";
                    case "GROQ" -> "https://api.groq.com/openai/v1/chat/completions";
                    case "OPENROUTER" -> "https://openrouter.ai/api/v1/chat/completions";
                    case "MISTRAL" -> "https://api.mistral.ai/v1/chat/completions";
                    case "PERPLEXITY" -> "https://api.perplexity.ai/chat/completions";
                    case "XAI" -> "https://api.x.ai/v1/chat/completions";
                    case "OLLAMA" -> "http://localhost:11434/v1/chat/completions";
                    default -> "https://api.openai.com/v1/chat/completions";
                };
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
                                mapper.writeValueAsString(system),
                                mapper.writeValueAsString(promptText)
                        );

                rawResponse = http.post()
                        .uri(url)
                        .header("Authorization", "Bearer " + apiKey.trim())
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(body)
                        .retrieve()
                        .body(String.class);

                text = readOpenAiText(rawResponse);
            } else {
                String instruction = system == null ? "" : system.trim();
                String body = instruction.isEmpty()
                        ? """
                        {"contents":[{"parts":[{"text":%s}]}],"generationConfig":{"responseMimeType":"application/json"}}
                        """.formatted(mapper.writeValueAsString(promptText))
                        : """
                        {"system_instruction":{"parts":[{"text":%s}]},"contents":[{"parts":[{"text":%s}]}],"generationConfig":{"responseMimeType":"application/json"}}
                        """.formatted(mapper.writeValueAsString(instruction), mapper.writeValueAsString(promptText));
                rawResponse = http.post()
                        .uri("https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}",
                                model, apiKey.trim())
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(body)
                        .retrieve()
                        .body(String.class);
                text = readText(rawResponse);
            }

            if (rawResponse != null) {
                JsonNode rootNode = mapper.readTree(rawResponse);
                long[] tokens = AiUsageMeteringService.extractTokenUsage(rootNode, promptText, text);
                promptTokens = tokens[0];
                completionTokens = tokens[1];
            }

            int start = text.indexOf('{');
            int end = text.lastIndexOf('}');
            if (start < 0 || end <= start) throw new IllegalStateException("AI returned no JSON");
            String json = text.substring(start, end + 1);
            mapper.readTree(json);
            success = true;
            return new AiJsonCompletion(json, promptTokens, completionTokens, provider, model);
        } finally {
            if (meteringService != null) {
                long latencyMs = (System.nanoTime() - startNs) / 1_000_000L;
                meteringService.recordUsageAsync(
                        taskType, provider, model, promptTokens, completionTokens, latencyMs, success);
            }
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
        return configured() ? getEffectiveProvider().toLowerCase() + ":" + getEffectiveModel() : fallback.modelVersion();
    }

    @Override
    public String promptVersion() {
        return configured() ? "screen-v2-hybrid" : fallback.promptVersion();
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
