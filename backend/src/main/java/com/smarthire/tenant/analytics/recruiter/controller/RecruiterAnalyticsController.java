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

    @GetMapping("/workload")
    @Operation(summary = "Get action counts and jobs requiring recruiter attention")
    public ApiResponse<WorkloadResponse> workload(@RequestParam(required = false) Instant from,
                                                   @RequestParam(required = false) Instant to) {
        return ApiResponse.ok(analytics.workload(filter(from, to)));
    }

    @GetMapping("/pipeline")
    @Operation(summary = "Get recruiter pipeline funnel and SLA alerts")
    public ApiResponse<PipelineResponse> pipeline(@RequestParam(required = false) Instant from,
                                                   @RequestParam(required = false) Instant to) {
        return ApiResponse.ok(analytics.pipeline(filter(from, to)));
    }

    @GetMapping("/quality")
    @Operation(summary = "Get candidate quality by source and quality trend")
    public ApiResponse<QualityResponse> quality(@RequestParam(required = false) Instant from,
                                                 @RequestParam(required = false) Instant to) {
        return ApiResponse.ok(analytics.quality(filter(from, to)));
    }

    @GetMapping("/performance")
    @Operation(summary = "Get personal recruiter performance metrics")
    public ApiResponse<PerformanceResponse> performance(@RequestParam(required = false) Instant from,
                                                         @RequestParam(required = false) Instant to) {
        return ApiResponse.ok(analytics.performance(filter(from, to)));
    }

    private static Filter filter(Instant from, Instant to) {
        Instant resolvedTo = to == null ? Instant.now() : to;
        Instant resolvedFrom = from == null ? resolvedTo.minus(30, ChronoUnit.DAYS) : from;
        if (!resolvedFrom.isBefore(resolvedTo) || resolvedFrom.isBefore(resolvedTo.minus(365, ChronoUnit.DAYS))) {
            throw new BusinessException("Analytics range must be between 1 and 365 days", HttpStatus.BAD_REQUEST, "ANALYTICS_RANGE_INVALID");
        }
        return new Filter(resolvedFrom, resolvedTo);
    }
}
