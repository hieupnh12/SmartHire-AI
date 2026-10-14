package com.smarthire.tenant.assessment.dto.request;

import com.fasterxml.jackson.databind.JsonNode;
import com.smarthire.domain.tenant.entity.CodingProblem;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;

public record CodingRequest(@NotBlank @Pattern(regexp = "CODING_ALGORITHM|CODING_OOP|SQL_QUERY") String category,
        @Min(100) @Max(10000) int timeLimitMs, @Min(32) @Max(512) int memoryMb,
        @NotNull JsonNode starterCode, @NotNull JsonNode harness,
        @NotEmpty @Size(max = 50) List<@NotNull @Valid Case> testCases, @Size(max = 255) String title) {
    public CodingRequest(String category, int timeLimitMs, int memoryMb, JsonNode starterCode, JsonNode harness, List<Case> testCases) {
        this(category, timeLimitMs, memoryMb, starterCode, harness, testCases, null);
    }
    public record Case(@NotNull @Size(max = 10000) String input,
            @NotNull @Size(max = 10000) String expectedOutput, boolean sample, @DecimalMin("0.00") @DecimalMax("100.00") @Digits(integer = 3, fraction = 2) java.math.BigDecimal weight) {
        public Case(String input, String expectedOutput, boolean sample) { this(input, expectedOutput, sample, null); }
    }

    public static CodingRequest from(CodingProblem problem, boolean candidate) {
        if (problem == null) return null;
        boolean weighted = problem.getTestCases().stream().filter(c -> !c.isSample()).map(c -> c.getWeight())
                .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add).compareTo(java.math.BigDecimal.valueOf(100)) == 0;
        return new CodingRequest(problem.getCategory(), problem.getTimeLimitMs(), problem.getMemoryMb(),
                problem.getStarterCodeJson(), candidate ? null : problem.getHarnessJson(),
                problem.getTestCases().stream().filter(c -> !candidate || c.isSample())
                        .map(c -> new Case(c.getInputData(), c.getExpectedOutput(), c.isSample(), candidate || !weighted ? null : c.getWeight())).toList(), problem.getTitle());
    }
}
