package com.smarthire.tenant.assessment.dto.request;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

public record BankQuestionRequest(@NotNull @Valid QuestionRequest question, JsonNode authoringMetadata) {}
