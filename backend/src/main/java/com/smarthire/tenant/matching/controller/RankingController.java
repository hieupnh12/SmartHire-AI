package com.smarthire.tenant.matching.controller;

import com.smarthire.common.api.ApiResponse;
import com.smarthire.tenant.matching.dto.RankingModels.*;
import com.smarthire.tenant.matching.service.RankingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
@Tag(name = "Candidate Ranking")
public class RankingController {
    private final RankingService service;
    public RankingController(RankingService service) { this.service = service; }
    @GetMapping("/rankings/jobs") @Operation(summary = "List jobs owned by the authenticated tenant recruiter")
    public ApiResponse<List<JobOption>> jobs() { return ApiResponse.ok(service.jobs()); }
    @GetMapping("/jobs/{id}/rankings") @Operation(summary = "Calculate current rankings within comparable score cohorts")
    public ApiResponse<Board> board(@PathVariable long id) { return ApiResponse.ok(service.board(id)); }
    @PostMapping("/jobs/{id}/rankings/recompute") @Operation(summary = "Recompute and persist all ranking snapshots for a job")
    public ApiResponse<Board> recompute(@PathVariable long id) { return ApiResponse.ok(service.recompute(id)); }
    @PutMapping("/jobs/{id}/rankings/config") @Operation(summary = "Save versioned weights and recompute the job atomically")
    public ApiResponse<Board> config(@PathVariable long id, @Valid @RequestBody Config request) { return ApiResponse.ok(service.configure(id, request)); }
    @GetMapping("/applications/{id}/overall-score") @Operation(summary = "Read score components and supporting evidence")
    public ApiResponse<Row> overall(@PathVariable long id) { return ApiResponse.ok(service.overall(id)); }
    @GetMapping("/applications/{id}/ranking-sources") @Operation(summary = "List CV and assessment/interview sources belonging to an application")
    public ApiResponse<Sources> sources(@PathVariable long id) { return ApiResponse.ok(service.sources(id)); }
    @PutMapping("/applications/{id}/ranking-sources") @Operation(summary = "Select official ranking sources and recompute the job")
    public ApiResponse<Board> select(@PathVariable long id, @Valid @RequestBody Selection request) { return ApiResponse.ok(service.select(id, request)); }
}
