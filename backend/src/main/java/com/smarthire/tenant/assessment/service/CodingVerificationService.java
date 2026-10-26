package com.smarthire.tenant.assessment.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.enums.QuestionType;
import com.smarthire.domain.tenant.entity.CodingProblem;
import com.smarthire.domain.tenant.entity.Question;
import com.smarthire.domain.tenant.repository.QuestionRepository;
import com.smarthire.tenant.assessment.dto.request.CodingVerificationRequest;
import com.smarthire.tenant.assessment.dto.request.QuestionRequest;
import com.smarthire.tenant.cv.service.CvAccess;
import java.time.Instant;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CodingVerificationService {
    private final CvAccess access;
    private final CodingJudge judge;
    private final QuestionRepository questions;

    public CodingVerificationService(CvAccess access, CodingJudge judge, QuestionRepository questions) {
        this.access = access;
        this.judge = judge;
        this.questions = questions;
    }

    @Transactional
    public List<JsonNode> verify(CodingVerificationRequest request) {
        if (!access.staff()) throw new BusinessException("Staff access required", HttpStatus.FORBIDDEN, "ASSESSMENT_FORBIDDEN");
        access.actor();
        CodingProblem problem;
        if (request.questionId() != null) {
            Question question = questions.findById(request.questionId()).orElseThrow(() ->
                    new BusinessException("Question not found", HttpStatus.NOT_FOUND, "QUESTION_NOT_FOUND"));
            if (question.getTest() != null) access.requireJob(question.getTest().getJob());
            problem = question.getCodingProblem();
            if (problem == null) throw new BusinessException("Missing coding problem", HttpStatus.BAD_REQUEST, "INVALID_TEST");
            if (!problem.getStarterCodeJson().has(request.language()))
                throw new BusinessException("Unsupported coding language", HttpStatus.BAD_REQUEST, "INVALID_TEST");
            QuestionContent.normalizeHiddenWeights(problem);
        } else {
            if (request.coding() == null) throw new BusinessException("Coding payload required", HttpStatus.BAD_REQUEST, "INVALID_TEST");
            var question = new Question();
            question.setQuestionText("Verify model solution");
            var content = new QuestionRequest("Verify model solution", 1, 0, null, null, null, List.of(), QuestionType.CODING, null, request.coding());
            QuestionContent.validate(content);
            if (!request.coding().starterCode().has(request.language()))
                throw new BusinessException("Unsupported coding language", HttpStatus.BAD_REQUEST, "INVALID_TEST");
            QuestionContent.apply(question, content);
            problem = question.getCodingProblem();
        }
        List<JsonNode> results;
        try {
            results = problem.getTestCases().stream()
                    .map(test -> judge.run(problem, request.language(), request.source(), test.getInputData(), test.getExpectedOutput()))
                    .toList();
        } catch (RuntimeException failure) {
            throw new BusinessException("Coding sandbox unavailable. Check configuration and retry.", HttpStatus.SERVICE_UNAVAILABLE, "CODING_SANDBOX_UNAVAILABLE");
        }
        boolean allPassed = !results.isEmpty() && results.stream().allMatch(result -> result.path("status").path("id").asInt() == 3);
        // Persist only when verifying a saved question and every case (incl. hidden) passes.
        if (request.questionId() != null) {
            if (allPassed) {
                problem.setVerifiedAt(Instant.now());
                problem.setVerifiedLanguage(request.language());
            } else {
                problem.setVerifiedAt(null);
                problem.setVerifiedLanguage(null);
            }
        }
        return results;
    }
}
