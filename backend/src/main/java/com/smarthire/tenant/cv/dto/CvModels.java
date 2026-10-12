package com.smarthire.tenant.cv.dto;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
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
            Instant createdAt,
            boolean fromBuilder) {}

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
            MatchView match,
            JsonNode builderData,
            String shareToken) {}

    public record BuilderPersonalInfo(
            @NotBlank @Size(max = 120) String fullName,
            @Size(max = 120) String title,
            @Size(max = 160) String email,
            @Size(max = 40) String phone,
            @Size(max = 200) String address,
            @Size(max = 200) String website,
            @Size(max = 5000) String summary,
            @Size(max = 512) @Pattern(regexp = "^$|^https://res\\.cloudinary\\.com/.+") String avatarUrl,
            @Size(max = 200) String github,
            @Size(max = 200) String linkedin,
            @Size(max = 12) List<@Valid BuilderDetail> details,
            @Size(max = 512) @Pattern(regexp = "^$|^https://res\\.cloudinary\\.com/.+|^/cv-assets/[\\w.-]+$") String logoUrl,
            @Valid BuilderAvatarCrop avatarCrop) {}

    /** Focus of the uncropped avatar: centre (0..1 of the image), zoom over a cover fit, image width/height ratio. */
    public record BuilderAvatarCrop(
            @NotNull @DecimalMin("0") @DecimalMax("1") Double x,
            @NotNull @DecimalMin("0") @DecimalMax("1") Double y,
            @NotNull @DecimalMin("1") @DecimalMax("3") Double zoom,
            @NotNull @DecimalMin("0.1") @DecimalMax("10") Double aspect) {}

    /** Candidate override of the template's photo frame. */
    public record BuilderAvatarStyle(
            @Pattern(regexp = "circle|rounded|square|portrait|landscape") String shape,
            @DecimalMin("20") @DecimalMax("45") Double sizeMm) {}

    /** Free label/value row of personal details (nationality, date of birth, ...). */
    public record BuilderDetail(@Size(max = 60) String label, @Size(max = 200) String value) {}

    public record BuilderItem(
            @Size(max = 64) String id,
            @Size(max = 200) String title,
            @Size(max = 200) String subtitle,
            @Size(max = 80) String date,
            @Size(max = 20000) String description,
            @Min(0) @Max(5) Integer level,
            @Size(max = 8) List<@Valid BuilderRow> rows) {}

    /** Enterprise-layout label/value row of an experience/project item; {@code description} mirrors the rows as HTML. */
    public record BuilderRow(@Size(max = 80) String label, @Size(max = 5000) String value) {}

    public record BuilderSection(
            @Size(max = 64) String id,
            @NotBlank @Pattern(regexp = "experience|education|projects|skills|languages|certifications|awards|activities|interests|references|custom") String type,
            @Size(max = 120) String title,
            boolean visible,
            @NotNull @Size(max = 50) List<@Valid BuilderItem> items) {}

    public record BuilderTheme(
            @Pattern(regexp = "^#[0-9a-fA-F]{6}$") String color,
            @Pattern(regexp = "modern|classic|compact|tahoma") String font,
            @Pattern(regexp = "sm|md|lg") String fontSize,
            @Pattern(regexp = "tight|normal|relaxed") String lineHeight,
            @Valid BuilderAvatarStyle avatar) {}

    public record CvBuilderData(
            @NotBlank @Size(max = 32) String templateId,
            @Pattern(regexp = "^#[0-9a-fA-F]{6}$") String accentColor,
            @Valid BuilderTheme theme,
            @Pattern(regexp = "vi|en") String language,
            @NotNull @Valid BuilderPersonalInfo personalInfo,
            @NotNull @Size(max = 20) List<@Valid BuilderSection> sections) {}

    /** Rendered CV sheet captured in the browser for PDF export. */
    public record CvPdfExportRequest(@NotBlank @Size(max = 5_000_000) String html, @Size(max = 5_000_000) String css) {}

    public record RenameCvRequest(@NotBlank @Size(max = 200) String name) {}

    public record ImageUploadView(String url) {}

    public record ShareView(String token) {}

    public record SharedCvView(JsonNode builderData) {}

    public record CvWritingRequest(
            @NotBlank @Pattern(regexp = "summary|description") String kind,
            @Pattern(regexp = "vi|en") String language,
            @Size(max = 120) String headline,
            @Pattern(regexp = "^$|experience|education|projects|skills|languages|certifications|awards|activities|interests|references|custom") String sectionType,
            @Size(max = 200) String itemTitle,
            @Size(max = 200) String itemSubtitle,
            @Size(max = 5000) String text) {}

    public record CvWritingView(List<String> suggestions) {}

    public record BuilderSkillHit(String name, boolean required) {}

    public record BuilderJobMatchView(
            long jobId,
            String jobTitle,
            int score,
            List<BuilderSkillHit> matched,
            List<BuilderSkillHit> missing,
            BigDecimal minYearsExperience,
            String educationLevel) {}

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
