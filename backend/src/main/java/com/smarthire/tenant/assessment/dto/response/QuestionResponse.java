package com.smarthire.tenant.assessment.dto.response;

import java.util.List;

public record QuestionResponse(
        Long id,
        String questionText,
        String questionType,
        int points,
        int questionOrder,
        String difficulty,
        String skill,
        String explanation,
        List<OptionResponse> options, com.fasterxml.jackson.databind.JsonNode rubricJson,
        com.smarthire.tenant.assessment.dto.request.CodingRequest coding) {
    public record OptionResponse(Long id, String optionText, boolean correct) {}
}
