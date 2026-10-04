package com.smarthire.tenant.assessment.dto.response;

import com.fasterxml.jackson.databind.JsonNode;

public record BankQuestionResponse(
        QuestionResponse question, Long testId, String testTitle, String testStatus,
        Long jobId, String jobTitle, boolean archived, JsonNode authoringMetadata) {}
