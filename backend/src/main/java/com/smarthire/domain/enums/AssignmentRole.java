package com.smarthire.domain.enums;

public enum AssignmentRole {
    PRIMARY_RECRUITER,
    CO_RECRUITER;

    public static AssignmentRole from(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            return AssignmentRole.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }
}
