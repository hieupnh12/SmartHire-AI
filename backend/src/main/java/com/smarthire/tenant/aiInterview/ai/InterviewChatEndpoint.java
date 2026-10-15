package com.smarthire.tenant.aiInterview.ai;

/** Shared routing for Gemini and OpenAI-compatible interview chat providers. */
final class InterviewChatEndpoint {
    private InterviewChatEndpoint() {}

    static boolean gemini(String provider) {
        return "GEMINI".equalsIgnoreCase(provider);
    }

    static void requireSupported(String provider) {
        if (!gemini(provider) && !"OPENAI".equalsIgnoreCase(provider)) {
            throw new IllegalStateException("AI interview requires a Gemini or OpenAI-compatible provider");
        }
    }

    static String baseUrl(String provider, String endpoint, String geminiDefault) {
        requireSupported(provider);
        String base = endpoint == null || endpoint.isBlank()
                ? (gemini(provider) ? geminiDefault : "https://api.openai.com/v1") : endpoint.trim();
        base = base.replaceAll("/+$", "").replaceAll("/chat/completions$", "");
        return gemini(provider) ? base.replaceAll("/models$", "/openai") : base;
    }
}
