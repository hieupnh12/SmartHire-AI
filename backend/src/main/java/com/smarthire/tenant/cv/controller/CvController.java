package com.smarthire.tenant.cv.controller;

import com.smarthire.common.api.ApiResponse;
import com.smarthire.tenant.cv.service.CvService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/cvs")
@Tag(name = "CV Screening")
public class CvController {

    private final CvService cvService;

    public CvController(CvService cvService) {
        this.cvService = cvService;
    }

    @GetMapping("/health")
    @Operation(summary = "CV Screening module scaffold health")
    public ResponseEntity<ApiResponse<Map<String, String>>> health() {
        return ResponseEntity.ok(ApiResponse.ok(cvService.health()));
    }
}

