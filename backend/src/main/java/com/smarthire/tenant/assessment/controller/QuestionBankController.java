package com.smarthire.tenant.assessment.controller;

import com.smarthire.common.api.ApiResponse;
import com.smarthire.tenant.assessment.dto.request.BankArchiveRequest;
import com.smarthire.tenant.assessment.dto.request.BankQuestionBatchRequest;
import com.smarthire.tenant.assessment.dto.request.BankQuestionRequest;
import com.smarthire.tenant.assessment.dto.request.QuestionBankGenerateRequest;
import com.smarthire.tenant.assessment.dto.response.BankQuestionPage;
import com.smarthire.tenant.assessment.dto.response.BankQuestionResponse;
import com.smarthire.tenant.assessment.service.QuestionBankGenerateService;
import com.smarthire.tenant.assessment.service.QuestionBankService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/question-bank")
@Tag(name = "Technical Assessment - General Question Bank")
public class QuestionBankController {
    private final QuestionBankService service;
    private final QuestionBankGenerateService generate;
    @org.springframework.beans.factory.annotation.Autowired
    private com.smarthire.tenant.assessment.service.CodingVerificationService verification;

    public QuestionBankController(QuestionBankService service, QuestionBankGenerateService generate) {
        this.service = service;
        this.generate = generate;
    }

    @PostMapping("/verify_coding")
    @Operation(summary = "Verify model solution against draft coding tests in sandbox (staff only)")
    public ApiResponse<List<com.fasterxml.jackson.databind.JsonNode>> verify(@Valid @RequestBody com.smarthire.tenant.assessment.dto.request.CodingVerificationRequest body) {
        return ApiResponse.ok(verification.verify(body));
    }

    @PostMapping("/generate_drafts")
    @Operation(summary = "Draft MCQ / multiple-choice / essay questions with AI into the bank workflow (staff only)",
            description = "Does not persist. Recruiter reviews drafts then POST /create_questions. Requires Admin AI task QUESTION_GEN.")
    public ApiResponse<List<BankQuestionRequest>> generateDrafts(@Valid @RequestBody QuestionBankGenerateRequest body) {
        return ApiResponse.ok(generate.generate(body));
    }

    @GetMapping("/list_questions")
    @Operation(summary = "List standalone and assessment questions in the current tenant (staff only)")
    public ApiResponse<BankQuestionPage> list(
            @RequestParam(required = false) Long jobId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(required = false) String collection,
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String skill,
            @RequestParam(required = false) String difficulty,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String questionType,
            @RequestParam(required = false) String source,
            @RequestParam(defaultValue = "latest") String sort,
            @RequestParam(required = false) List<Long> favoriteIds) {
        return ApiResponse.ok(service.list(page, size, collection, query, skill, difficulty, status,
                questionType, source, sort, favoriteIds, jobId));
    }

    @GetMapping("/get_question/{id}")
    @Operation(summary = "Get a question with options and authoring metadata (staff only)")
    public ApiResponse<BankQuestionResponse> get(@PathVariable long id) { return ApiResponse.ok(service.get(id)); }

    @PostMapping("/create_questions")
    @Operation(summary = "Create 1-999 standalone questions atomically without creating an assessment (staff only)")
    public ResponseEntity<ApiResponse<List<BankQuestionResponse>>> create(@Valid @RequestBody BankQuestionBatchRequest body) {
        return ResponseEntity.status(201).body(ApiResponse.ok(service.create(body.questions())));
    }

    @PutMapping("/update_question/{id}")
    @Operation(summary = "Replace a standalone question and options (staff only)",
            description = "Questions attached to an assessment must be edited through the original draft assessment.")
    public ApiResponse<BankQuestionResponse> update(@PathVariable long id, @Valid @RequestBody BankQuestionRequest body) {
        return ApiResponse.ok(service.update(id, body));
    }

    @PutMapping("/archive_questions")
    @Operation(summary = "Archive or restore standalone bank questions atomically (staff only)")
    public ApiResponse<Void> archive(@Valid @RequestBody BankArchiveRequest body) {
        service.archive(body.questionIds(), body.archived());
        return ApiResponse.ok(null);
    }
}
