package com.smarthire.tenant.cv.ai;

public interface CvAiClient {
    String extractJson(String rawText, String jobContext);
    String modelVersion();
    String promptVersion();
}
