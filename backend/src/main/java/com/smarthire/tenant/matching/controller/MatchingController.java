package com.smarthire.tenant.matching.controller;

import com.smarthire.common.api.ApiResponse;
import com.smarthire.tenant.matching.service.MatchingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/rankings")
@Tag(name = "Matching & Ranking")
public class MatchingController {

    private final MatchingService matchingService;

    public MatchingController(MatchingService matchingService) {
        this.matchingService = matchingService;
    }

    @GetMapping("/health")
    @Operation(summary = "Matching & Ranking module scaffold health")
    public ResponseEntity<ApiResponse<Map<String, String>>> health() {
        return ResponseEntity.ok(ApiResponse.ok(matchingService.health()));
    }
}

