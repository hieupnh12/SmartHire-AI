package com.smarthire.domain.enums;

public enum UserRole {
    TENANT_ADMIN,
    ADMIN,
    HR,
    RECRUITER,
    CANDIDATE;

    public static boolean isCompanyAdmin(String code) {
        return TENANT_ADMIN.name().equals(code) || ADMIN.name().equals(code);
    }

    public static boolean isCandidate(String code) {
        return CANDIDATE.name().equals(code);
    }

    public static boolean isRecruiterStaff(String code) {
        return code != null && !code.isBlank() && !isCompanyAdmin(code) && !isCandidate(code);
    }

    public static String workspaceOf(String code) {
        if (isCompanyAdmin(code)) {
            return "ADMIN";
        }
        if (isCandidate(code)) {
            return "CANDIDATE";
        }
        return "RECRUITER";
    }
}
