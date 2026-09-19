package com.smarthire.tenant.cv.dto;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public final class CvModels {
    private CvModels() {}

    public record CvSummary(
            long id,
            Long jobId,
            long userId,
            String candidateName,
            String originalFilename,
            String status,
            BigDecimal matchScore,
            String errorCode,
            Instant createdAt) {}

    public record SkillView(String skillName, String canonicalName, String category, BigDecimal confidence) {}

    public record AnalysisView(String summary, BigDecimal yearsExperience, String modelVersion, String promptVersion) {}

    public record CvDetail(
            long id,
            Long jobId,
            long userId,
            Long applicationId,
            String candidateName,
            String originalFilename,
            String mimeType,
            Long fileSize,
            String status,
            String errorCode,
            String errorMessage,
            Instant createdAt,
            JsonNode extraction,
            String extractionModel,
            List<SkillView> skills,
            AnalysisView analysis,
            MatchView match) {}

    public record MatchView(
            long jobId,
            long cvId,
            BigDecimal score,
            JsonNode breakdown,
            String modelVersion) {}

    public record JobSkillItem(
            @NotBlank String name,
            String category,
            boolean required,
            @NotNull BigDecimal weight,
            String minLevel) {}

    public record JobSkillsRequest(@NotEmpty List<JobSkillItem> skills) {}

    public record JobSkillView(long skillId, String name, String category, boolean required, BigDecimal weight, String minLevel) {}

    public record JobOption(long id, String title, String status) {}

    public record JobCreateRequest(
            @NotBlank String title,
            String description,
            List<JobSkillItem> skills) {}
}
