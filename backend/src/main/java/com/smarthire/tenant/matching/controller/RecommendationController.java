package com.smarthire.tenant.matching.controller;

import com.smarthire.common.api.ApiResponse;
import com.smarthire.tenant.matching.dto.RecommendationModels.CandidateJobRecommendationPage;
import com.smarthire.tenant.matching.dto.RecommendationModels.CandidateRecommendationItem;
import com.smarthire.tenant.matching.service.JobRecommendationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
@Tag(name = "Recommendations")
public class RecommendationController {

    private final JobRecommendationService recommendations;

    public RecommendationController(JobRecommendationService recommendations) {
        this.recommendations = recommendations;
    }

    @GetMapping("/recommendations/jobs")
    @Operation(summary = "Recommend open jobs for the signed-in candidate based on their analyzed CV")
    public ApiResponse<CandidateJobRecommendationPage> recommendJobs(
            @RequestParam(defaultValue = "20") int limit) {
        return ApiResponse.ok(recommendations.recommendJobsForCandidate(limit));
    }

    @GetMapping("/jobs/{id}/recommendations/candidates")
    @Operation(summary = "Recommend candidates from the tenant pool for a job")
    public ApiResponse<List<CandidateRecommendationItem>> recommendCandidates(
            @PathVariable long id,
            @RequestParam(defaultValue = "20") int limit) {
        return ApiResponse.ok(recommendations.recommendCandidatesForJob(id, limit));
    }
}

