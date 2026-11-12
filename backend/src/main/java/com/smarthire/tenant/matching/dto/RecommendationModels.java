package com.smarthire.tenant.matching.dto;

import com.smarthire.tenant.job.dto.JobModels.PublicJob;
import java.math.BigDecimal;
import java.util.List;

public final class RecommendationModels {
    private RecommendationModels() {
    }

    public record JobRecommendationItem(
            PublicJob job,
            BigDecimal score,
            List<String> matchedSkills,
            List<String> missingSkills,
            List<String> reasons) {
    }

    public record CandidateJobRecommendationPage(
            Long analyzedCvId,
            String analyzedCvFilename,
            boolean hasAnalyzedCv,
            List<JobRecommendationItem> items) {
    }

    public record CandidateRecommendationItem(
            Long candidateId,
            String candidateName,
            String headline,
            String avatarUrl,
            Long cvId,
            String cvFilename,
            BigDecimal score,
            List<String> matchedSkills,
            List<String> missingSkills,
            boolean alreadyApplied,
            List<String> reasons) {
    }
}

