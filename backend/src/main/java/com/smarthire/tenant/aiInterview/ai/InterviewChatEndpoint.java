package com.smarthire.tenant.aiInterview.ai;

import java.util.Locale;
import java.util.Map;

/** Shared routing for Gemini and OpenAI-compatible interview chat providers. */
final class InterviewChatEndpoint {
    private static final String GEMINI_OPENAI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai";
    private static final Map<String, String> DEFAULT_BASE_URLS = Map.of(
            "OPENAI", "https://api.openai.com/v1",
            "DEEPSEEK", "https://api.deepseek.com",
            "GROQ", "https://api.groq.com/openai/v1",
            "OPENROUTER", "https://openrouter.ai/api/v1",
            "MISTRAL", "https://api.mistral.ai/v1",
            "PERPLEXITY", "https://api.perplexity.ai",
            "XAI", "https://api.x.ai/v1",
            "OLLAMA", "http://localhost:11434/v1",
            "CURSOR", "https://api.cursor.com");
    /** OpenAI-compatible gateway with no default host; the API key's Endpoint URL is mandatory. */
    private static final String CUSTOM = "CUSTOM";
    /** Ollama ignores authentication, but the OpenAI client still needs a non-empty bearer token. */
    private static final String OLLAMA_PLACEHOLDER_KEY = "ollama";

    private InterviewChatEndpoint() {}

    static boolean gemini(String provider) {
        return "GEMINI".equalsIgnoreCase(provider);
    }

    static boolean cursor(String provider) {
        return "CURSOR".equalsIgnoreCase(provider);
    }

    static void requireSupported(String provider) {
        String normalized = provider == null ? "" : provider.toUpperCase(Locale.ROOT);
        if (!gemini(provider) && !DEFAULT_BASE_URLS.containsKey(normalized) && !CUSTOM.equals(normalized)) {
            throw new IllegalStateException("AI interview requires a Gemini, OpenAI, DeepSeek, Groq, OpenRouter, "
                    + "Mistral, Perplexity, xAI, Ollama, Cursor or Custom (OpenAI-compatible) provider");
        }
    }

    static String apiKey(String provider, String key) {
        String value = key == null ? "" : key.trim();
        return value.isBlank() && "OLLAMA".equalsIgnoreCase(provider) ? OLLAMA_PLACEHOLDER_KEY : value;
    }

    static String baseUrl(String provider, String endpoint) {
        requireSupported(provider);
        String base = endpoint == null || endpoint.isBlank()
                ? (gemini(provider) ? GEMINI_OPENAI_BASE_URL : DEFAULT_BASE_URLS.get(provider.toUpperCase(Locale.ROOT)))
                : endpoint.trim();
        if (base == null) {
            throw new IllegalStateException("Provider " + provider
                    + " requires an Endpoint URL on its API key in Admin > AI Config");
        }
        base = base.replaceAll("/+$", "").replaceAll("/chat/completions$", "").replaceAll("/v1/agents$", "");
        return gemini(provider) ? base.replaceAll("/models$", "/openai") : base;
    }
}
