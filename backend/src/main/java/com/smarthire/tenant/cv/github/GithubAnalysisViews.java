package com.smarthire.tenant.cv.github;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.domain.tenant.entity.GithubAnalysis;
import com.smarthire.tenant.cv.dto.CvModels.GithubAnalysisView;

public final class GithubAnalysisViews {
    private GithubAnalysisViews() {}

    public static GithubAnalysisView toView(GithubAnalysis row, ObjectMapper mapper) {
        return new GithubAnalysisView(
                row.getStatus().name(),
                row.getScore(),
                row.getErrorCode(),
                row.getErrorMessage(),
                row.getAnalyzedAt(),
                row.isCacheHit(),
                row.getPromptTokens(),
                row.getCompletionTokens(),
                json(mapper, row.getResultJson()));
    }

    private static JsonNode json(ObjectMapper mapper, String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return mapper.readTree(value);
        } catch (Exception ex) {
            return mapper.getNodeFactory().textNode(value);
        }
    }
}
