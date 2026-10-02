package com.smarthire.domain.enums;

import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

public enum RecruitmentStageCode {
    APPLIED("Applied", false, true),
    SCREENING("Screening", false, false),
    ASSESSMENT("Assessment", false, false),
    INTERVIEW("Interview", false, false),
    OFFER("Offer", false, false),
    HIRED("Hired", true, true);

    private final String defaultName;
    private final boolean terminal;
    private final boolean locked;

    RecruitmentStageCode(String defaultName, boolean terminal, boolean locked) {
        this.defaultName = defaultName;
        this.terminal = terminal;
        this.locked = locked;
    }

    public String defaultName() {
        return defaultName;
    }

    public boolean terminal() {
        return terminal;
    }

    public boolean locked() {
        return locked;
    }

    public static List<RecruitmentStageCode> catalogOrder() {
        return List.of(values());
    }

    public static Optional<RecruitmentStageCode> fromCode(String raw) {
        if (raw == null || raw.isBlank()) {
            return Optional.empty();
        }
        try {
            return Optional.of(valueOf(raw.trim().toUpperCase(Locale.ROOT)));
        } catch (IllegalArgumentException ex) {
            return Optional.empty();
        }
    }

    public static boolean isMiddle(RecruitmentStageCode code) {
        return code != APPLIED && code != HIRED;
    }

    public static List<RecruitmentStageCode> middleCodes() {
        return Arrays.stream(values()).filter(RecruitmentStageCode::isMiddle).toList();
    }
}
