package com.smarthire.messaging;

public record CvJobPayload(long cvId) {
    public static long cvIdFrom(String payload) {
        if (payload == null || payload.isBlank()) throw new IllegalArgumentException("Empty CV job payload");
        String digits = payload.replaceAll("[^0-9]", " ").trim();
        if (digits.isBlank()) throw new IllegalArgumentException("CV id missing");
        return Long.parseLong(digits.split("\\s+")[0]);
    }
}
