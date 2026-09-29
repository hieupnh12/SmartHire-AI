package com.smarthire.tenant.aiInterview.dto.response;

/** One stage of the frozen interview plan; {@code kind} is {@code OPEN} or {@code MCQ}. */
public record RoadmapStep(String title, String kind, int questionCount) {
}
