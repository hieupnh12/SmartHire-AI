package com.smarthire.tenant.assessment.dto.response;

import java.util.List;

public record BankQuestionPage(List<BankQuestionResponse> items, long total, int page, int size,
        BankQuestionCounts counts, List<String> skills) {}
