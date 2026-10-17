package com.smarthire.tenant.assessment.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.enums.QuestionType;
import com.smarthire.domain.tenant.entity.Question;
import com.smarthire.tenant.assessment.dto.request.CodingVerificationRequest;
import com.smarthire.tenant.assessment.dto.request.QuestionRequest;
import com.smarthire.tenant.cv.service.CvAccess;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class CodingVerificationService {
    private final CvAccess access;
    private final CodingJudge judge;

    public CodingVerificationService(CvAccess access, CodingJudge judge) {
        this.access = access;
        this.judge = judge;
    }

    public List<JsonNode> verify(CodingVerificationRequest request) {
        if (!access.staff()) throw new BusinessException("Staff access required", HttpStatus.FORBIDDEN, "ASSESSMENT_FORBIDDEN");
        access.actor();
        var question = new Question();
        question.setQuestionText("Verify model solution");
        var content = new QuestionRequest("Verify model solution", 1, 0, null, null, null, List.of(), QuestionType.CODING, null, request.coding());
        QuestionContent.validate(content);
        if (!request.coding().starterCode().has(request.language()))
            throw new BusinessException("Unsupported coding language", HttpStatus.BAD_REQUEST, "INVALID_TEST");
        QuestionContent.apply(question, content);
        try {
            return question.getCodingProblem().getTestCases().stream()
                    .map(test -> judge.run(question.getCodingProblem(), request.language(), request.source(), test.getInputData(), test.getExpectedOutput()))
                    .toList();
        } catch (RuntimeException failure) {
            throw new BusinessException("Coding sandbox unavailable. Check configuration and retry.", HttpStatus.SERVICE_UNAVAILABLE, "CODING_SANDBOX_UNAVAILABLE");
        }
    }
}
