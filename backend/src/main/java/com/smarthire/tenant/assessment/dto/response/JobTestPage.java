package com.smarthire.tenant.assessment.dto.response;

import java.util.List;

public record JobTestPage(List<JobTestResponse> items, long total, int page, int size) {
}
