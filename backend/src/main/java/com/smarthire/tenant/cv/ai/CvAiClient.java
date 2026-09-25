package com.smarthire.tenant.cv.ai;

public interface CvAiClient {
    String extractJson(String rawText, String jobContext);
    String modelVersion();
    String promptVersion();

    default String modelVersionFor(String json) {
        return modelVersion();
    }

    default String promptVersionFor(String json) {
        return promptVersion();
    }
}
