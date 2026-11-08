package com.smarthire.tenant.assessment.service;

import com.smarthire.domain.tenant.entity.ProctorEvent;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

/** Deterministic integrity risk (0..100) from append-only proctor events. */
public final class ProctorRisk {
    static final Map<String, Integer> WEIGHTS = Map.ofEntries(
            Map.entry("MULTI_FACE", 25), Map.entry("LOST_FACE", 15),
            Map.entry("SCREEN_SHARE_STOPPED", 20), Map.entry("CAMERA_LOST", 20), Map.entry("MICROPHONE_LOST", 10),
            Map.entry("PAGE_HIDDEN", 15), Map.entry("FULLSCREEN_EXIT", 10), Map.entry("WINDOW_BLUR", 5),
            Map.entry("PASTE_ATTEMPT", 10), Map.entry("COPY_ATTEMPT", 5),
            Map.entry("BLOCKED_SHORTCUT", 3), Map.entry("CONTEXT_MENU", 2));

    public record Result(BigDecimal score, String level, Map<String, Integer> counts) {}

    private ProctorRisk() {}

    public static Result of(List<ProctorEvent> events) {
        var counts = new TreeMap<String, Integer>();
        int total = 0;
        for (var event : events) {
            counts.merge(event.getEventType(), 1, Integer::sum);
            total += WEIGHTS.getOrDefault(event.getEventType(), 0);
        }
        int score = Math.min(100, total);
        String level = score >= 60 ? "HIGH" : score >= 30 ? "MEDIUM" : "LOW";
        return new Result(BigDecimal.valueOf(score).setScale(2), level, counts);
    }
}
