package com.smarthire.tenant.assessment.dto.response;

import com.smarthire.tenant.assessment.dto.request.QuestionRequest;
import java.util.List;

public record BankGenerationResponse(String id, String status, List<QuestionRequest> questions, String error, String model) {
    public BankGenerationResponse(String id, String status, List<QuestionRequest> questions, String error) {
        this(id, status, questions, error, null);
    }
}
