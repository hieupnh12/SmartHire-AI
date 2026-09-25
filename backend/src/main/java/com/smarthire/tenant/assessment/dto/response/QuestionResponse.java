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
        List<OptionResponse> options) {
    public record OptionResponse(Long id, String optionText, boolean correct) {}
}
