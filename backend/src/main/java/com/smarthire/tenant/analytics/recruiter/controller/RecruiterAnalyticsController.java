package com.smarthire.tenant.analytics.recruiter.controller;

import static com.smarthire.tenant.analytics.recruiter.dto.RecruiterAnalyticsModels.*;

import com.smarthire.common.api.ApiResponse;
import com.smarthire.common.exception.BusinessException;
import com.smarthire.tenant.analytics.recruiter.service.RecruiterAnalyticsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/analytics/recruiter")
@Tag(name = "Recruiter Analytics")
public class RecruiterAnalyticsController {
    private final RecruiterAnalyticsService analytics;

    public RecruiterAnalyticsController(RecruiterAnalyticsService analytics) {
        this.analytics = analytics;
    }

    @GetMapping("/job-overview")
    @Operation(summary = "Get job-scoped analytics overview header and SLA summary")
    public ApiResponse<JobOverviewResponse> jobOverview(@RequestParam Long jobId,
                                                        @RequestParam(required = false) Instant from,
                                                        @RequestParam(required = false) Instant to) {
        return ApiResponse.ok(analytics.jobOverview(filter(from, to, jobId)));
    }

    @GetMapping("/workload")
    @Operation(summary = "Get action counts and jobs requiring recruiter attention")
    public ApiResponse<WorkloadResponse> workload(@RequestParam(required = false) Instant from,
                                                   @RequestParam(required = false) Instant to,
                                                   @RequestParam(required = false) Long jobId) {
        return ApiResponse.ok(analytics.workload(filter(from, to, jobId)));
    }

    @GetMapping("/pipeline")
    @Operation(summary = "Get recruiter pipeline funnel, drop-offs, time-in-stage, and SLA alerts")
    public ApiResponse<PipelineResponse> pipeline(@RequestParam(required = false) Instant from,
                                                   @RequestParam(required = false) Instant to,
                                                   @RequestParam(required = false) Long jobId) {
        return ApiResponse.ok(analytics.pipeline(filter(from, to, jobId)));
    }

    @GetMapping("/quality")
    @Operation(summary = "Get candidate quality by source, quality trend, and multi-round score distributions")
    public ApiResponse<QualityResponse> quality(@RequestParam(required = false) Instant from,
                                                 @RequestParam(required = false) Instant to,
                                                 @RequestParam(required = false) Long jobId) {
        return ApiResponse.ok(analytics.quality(filter(from, to, jobId)));
    }

    @GetMapping("/performance")
    @Operation(summary = "Get personal or job-scoped recruiter performance metrics")
    public ApiResponse<PerformanceResponse> performance(@RequestParam(required = false) Instant from,
                                                         @RequestParam(required = false) Instant to,
                                                         @RequestParam(required = false) Long jobId) {
        return ApiResponse.ok(analytics.performance(filter(from, to, jobId)));
    }

    @GetMapping("/job-insights")
    @Operation(summary = "Get job-scoped skill gaps, loss reasons, proctoring, and interview insights")
    public ApiResponse<JobInsightsResponse> jobInsights(@RequestParam Long jobId,
                                                        @RequestParam(required = false) Instant from,
                                                        @RequestParam(required = false) Instant to) {
        return ApiResponse.ok(analytics.jobInsights(filter(from, to, jobId)));
    }

    private static Filter filter(Instant from, Instant to, Long jobId) {
        Instant resolvedTo = to == null ? Instant.now() : to;
        Instant resolvedFrom = from == null ? resolvedTo.minus(30, ChronoUnit.DAYS) : from;
        if (!resolvedFrom.isBefore(resolvedTo) || resolvedFrom.isBefore(resolvedTo.minus(365, ChronoUnit.DAYS))) {
            throw new BusinessException("Analytics range must be between 1 and 365 days", HttpStatus.BAD_REQUEST, "ANALYTICS_RANGE_INVALID");
        }
        return new Filter(resolvedFrom, resolvedTo, jobId);
    }
}
