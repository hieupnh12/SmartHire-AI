package com.smarthire.domain.enums;

import java.util.Arrays;
import java.util.List;

public enum RecruiterFeature {
    DASHBOARD,
    JOBS,
    APPLICANTS,
    CV_SCREENING,
    RANKING,
    PIPELINE,
    ANALYTICS,
    ASSESSMENTS,
    INTERVIEWS,
    SCHEDULES,
    NOTIFICATIONS;

    public static List<String> codes() {
        return Arrays.stream(values()).map(Enum::name).toList();
    }

    public static RecruiterFeature fromCode(String code) {
        if (code == null || code.isBlank()) {
            return null;
        }
        try {
            return RecruiterFeature.valueOf(code.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    public static RecruiterFeature fromPath(String requestPath) {
        if (requestPath == null || requestPath.isBlank()) {
            return null;
        }
        String path = requestPath;
        int query = path.indexOf('?');
        if (query >= 0) {
            path = path.substring(0, query);
        }
        if (path.contains("/rankings")
                || path.contains("/ranking-sources")
                || path.endsWith("/overall-score")
                || path.contains("/recommendations")) {
            return RANKING;
        }
        if (path.startsWith("/api/v1/dashboard/charts") || path.startsWith("/api/v1/dashboard/trends")) {
            return ANALYTICS;
        }
        if (path.startsWith("/api/v1/dashboard")) {
            return DASHBOARD;
        }
        if (path.startsWith("/api/v1/jobs")) {
            return JOBS;
        }
        if (path.startsWith("/api/v1/applications")) {
            return APPLICANTS;
        }
        if (path.startsWith("/api/v1/cvs")) {
            return CV_SCREENING;
        }
        if (path.startsWith("/api/v1/workflow")) {
            return PIPELINE;
        }
        if (path.startsWith("/api/v1/assessments")) {
            return ASSESSMENTS;
        }
        if (path.startsWith("/api/v1/interviews")) {
            return INTERVIEWS;
        }
        if (path.startsWith("/api/v1/schedules")) {
            return SCHEDULES;
        }
        if (path.startsWith("/api/v1/notifications")) {
            return NOTIFICATIONS;
        }
        return null;
    }
}
