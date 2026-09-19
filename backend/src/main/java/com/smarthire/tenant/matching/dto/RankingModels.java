package com.smarthire.tenant.matching.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;

public final class RankingModels {
    private RankingModels() {}

    public record Weights(@Min(0) @Max(100) int skills, @Min(0) @Max(100) int experience,
                          @Min(0) @Max(100) int assessment, @Min(0) @Max(100) int interview) {}
    public record Config(@NotNull @Valid Weights weights,
                         @NotEmpty Map<@NotBlank String, @NotNull @Min(0) @Max(100) Integer> groups,
                         @Min(0) @Max(1200) int requiredExperienceMonths,
                         @Min(0) long revision) {}
    public record Selection(@Positive Long cvId, @Positive Long attemptId, @Positive Long interviewId) {}
    public record JobOption(long id, String title) {}
    public record SourceOption(long id, String label, String status) {}
    public record Sources(List<SourceOption> cvs, List<SourceOption> attempts, List<SourceOption> interviews,
                          Selection selected) {}
    public record SkillMatch(String requiredSkill, String candidateSkill, BigDecimal similarity,
                             boolean required, String evidence) {}
    public record GroupScore(String category, int weight, BigDecimal score, BigDecimal coverage,
                             List<SkillMatch> matches) {}
    public record Component(String key, BigDecimal score, int weight, BigDecimal contribution, String state) {}
    public record Calculation(BigDecimal score, int availableWeight, int completedComponents,
                              int requiredComponents, String cohort, boolean complete, List<Component> components) {}
    public record TimelineEvent(String type, Instant occurredAt) {}
    public record Insight(String recommendation, List<String> strengths, List<String> risks, List<String> questions) {}
    public record Row(long applicationId, String candidateName, String status, Integer rank,
                      Calculation result, List<GroupScore> groups, List<String> missingRequired,
                      Integer experienceMonths, List<String> experienceEvidence, List<String> notices,
                      Selection sources, String interviewFeedback, List<TimelineEvent> timeline, Insight insight) {
        public Row withRank(Integer position) {
            return new Row(applicationId, candidateName, status, position, result, groups, missingRequired,
                    experienceMonths, experienceEvidence, notices, sources, interviewFeedback, timeline, insight);
        }
    }
    public record Board(long jobId, String jobTitle, Config config, String rankingVersion,
                        Instant calculatedAt, List<Row> rows, List<String> skillCategories) {}
    public record Summary(long totalCandidates, long activeCandidates, long scoredCandidates,
                          BigDecimal averageScore, String topCandidateName, BigDecimal topScore,
                          long completeCandidates) {}
    public record PageInfo(int number, int size, long totalElements, int totalPages) {}
    public record BoardPage(long jobId, String jobTitle, Config config, String rankingVersion,
                            Instant calculatedAt, List<Row> rows, List<String> skillCategories,
                            List<String> cohorts, Summary summary, PageInfo page) {}
}
