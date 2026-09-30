package com.smarthire.domain.enums;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class RecruiterFeatureTest {

    @Test
    void mapsRankingPathsBeforeJobs() {
        assertEquals(RecruiterFeature.RANKING, RecruiterFeature.fromPath("/api/v1/jobs/8/rankings"));
        assertEquals(RecruiterFeature.RANKING, RecruiterFeature.fromPath("/api/v1/rankings/jobs"));
        assertEquals(RecruiterFeature.RANKING, RecruiterFeature.fromPath("/api/v1/applications/3/ranking-sources"));
        assertEquals(RecruiterFeature.RANKING, RecruiterFeature.fromPath("/api/v1/jobs/8/recommendations/candidates"));
    }

    @Test
    void mapsRecruiterModules() {
        assertEquals(RecruiterFeature.JOBS, RecruiterFeature.fromPath("/api/v1/jobs/health"));
        assertEquals(RecruiterFeature.APPLICANTS, RecruiterFeature.fromPath("/api/v1/applications"));
        assertEquals(RecruiterFeature.CV_SCREENING, RecruiterFeature.fromPath("/api/v1/cvs/1"));
        assertEquals(RecruiterFeature.DASHBOARD, RecruiterFeature.fromPath("/api/v1/dashboard/summary"));
        assertEquals(RecruiterFeature.ANALYTICS, RecruiterFeature.fromPath("/api/v1/dashboard/charts"));
        assertEquals(RecruiterFeature.ANALYTICS, RecruiterFeature.fromPath("/api/v1/analytics/recruiter/workload"));
        assertEquals(RecruiterFeature.PIPELINE, RecruiterFeature.fromPath("/api/v1/workflow/stages"));
        assertNull(RecruiterFeature.fromPath("/api/v1/tenant/auth/me"));
    }
}
