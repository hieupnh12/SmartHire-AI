package com.smarthire.tenant.cv.github;

import com.smarthire.common.exception.BusinessException;

public interface GithubCodeAdvisor {
    String modelKey();

    Advice advise(String system, String user);

    record Advice(String json, long promptTokens, long completionTokens, String model) {}

    static boolean quota(Exception ex) {
        if (ex instanceof BusinessException business) {
            String code = business.getCode() == null ? "" : business.getCode();
            return code.contains("QUOTA") || code.contains("LIMIT") || code.contains("429");
        }
        String message = ex.getMessage() == null ? "" : ex.getMessage();
        return message.contains("429") || message.contains("RESOURCE_EXHAUSTED") || message.contains("quota");
    }
}
