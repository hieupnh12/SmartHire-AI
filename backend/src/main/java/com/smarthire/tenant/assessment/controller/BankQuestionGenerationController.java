package com.smarthire.tenant.assessment.controller;

import com.smarthire.common.api.ApiResponse;
import com.smarthire.tenant.assessment.dto.request.BankGenerationRequest;
import com.smarthire.tenant.assessment.dto.response.BankGenerationResponse;
import com.smarthire.tenant.assessment.service.BankQuestionGenerationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/question-bank/generation")
@Tag(name = "Technical Assessment - AI Question Generation")
public class BankQuestionGenerationController {
    private final BankQuestionGenerationService service;
    public BankQuestionGenerationController(BankQuestionGenerationService service) { this.service = service; }
    @PostMapping
    @Operation(summary = "Queue Llama question generation for staff review; does not save bank questions")
    public ResponseEntity<ApiResponse<BankGenerationResponse>> start(@Valid @RequestBody BankGenerationRequest request) {
        return ResponseEntity.accepted().body(ApiResponse.ok(service.start(request)));
    }
    @GetMapping("/{id}")
    @Operation(summary = "Read the current user's generated draft in the current tenant")
    public ApiResponse<BankGenerationResponse> status(@PathVariable UUID id) { return ApiResponse.ok(service.status(id.toString())); }
}
