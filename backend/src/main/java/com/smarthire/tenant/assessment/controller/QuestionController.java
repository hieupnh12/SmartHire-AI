package com.smarthire.tenant.assessment.controller;

import com.smarthire.common.api.ApiResponse;
import com.smarthire.tenant.assessment.dto.request.QuestionRequest;
import com.smarthire.tenant.assessment.dto.response.QuestionResponse;
import com.smarthire.tenant.assessment.dto.response.JobTestResponse;
import com.smarthire.tenant.assessment.service.QuestionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/assessments/{testId}")
@Tag(name = "Technical Assessment - Questions")
public class QuestionController {
    private final QuestionService service;

    public QuestionController(QuestionService service) { this.service = service; }

    @GetMapping("/list_questions")
    @Operation(summary = "List questions and options of a JobTest (staff only)")
    public ApiResponse<List<QuestionResponse>> list(@PathVariable long testId) {
        return ApiResponse.ok(service.list(testId));
    }

    @PostMapping("/create_question")
    @Operation(summary = "Create an MCQ question with options in a draft JobTest (staff only)")
    public ResponseEntity<ApiResponse<QuestionResponse>> create(@PathVariable long testId, @Valid @RequestBody QuestionRequest body) {
        return ResponseEntity.status(201).body(ApiResponse.ok(service.create(testId, body)));
    }

    @PutMapping("/update_question/{questionId}")
    @Operation(summary = "Replace a draft question and all its options (staff only)",
            description = "Option IDs are regenerated. Published tests cannot be edited.")
    public ApiResponse<QuestionResponse> update(@PathVariable long testId, @PathVariable long questionId, @Valid @RequestBody QuestionRequest body) {
        return ApiResponse.ok(service.update(testId, questionId, body));
    }

    @DeleteMapping("/delete_question/{questionId}")
    @Operation(summary = "Delete a draft question and its options (staff only)")
    public ApiResponse<Void> delete(@PathVariable long testId, @PathVariable long questionId) {
        service.delete(testId, questionId);
        return ApiResponse.ok(null);
    }

    @PostMapping("/publish_test")
    @Operation(summary = "Validate and publish an MCQ-only JobTest (staff only)",
            description = "Requires 1-100 questions, exactly one correct option per question and a valid passing score. Freezes test metadata and questions.")
    public ApiResponse<JobTestResponse> publish(@PathVariable long testId) {
        return ApiResponse.ok(service.publish(testId));
    }
}
