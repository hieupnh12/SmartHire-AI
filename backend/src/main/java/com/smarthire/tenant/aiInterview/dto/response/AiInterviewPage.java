package com.smarthire.tenant.aiInterview.dto.response;

import java.util.List;

public record AiInterviewPage(List<AiInterviewResponse> items, long total, int page, int size) {
}
