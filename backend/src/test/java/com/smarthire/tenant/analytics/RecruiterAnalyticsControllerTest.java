package com.smarthire.tenant.analytics;

import static com.smarthire.tenant.analytics.recruiter.dto.RecruiterAnalyticsModels.*;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.smarthire.common.exception.GlobalExceptionHandler;
import com.smarthire.tenant.analytics.recruiter.controller.RecruiterAnalyticsController;
import com.smarthire.tenant.analytics.recruiter.service.RecruiterAnalyticsService;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class RecruiterAnalyticsControllerTest {

    @Test
    void forwardsJobIdToAnalyticsServiceEndpoints() throws Exception {
        RecruiterAnalyticsService service = mock(RecruiterAnalyticsService.class);
        when(service.jobOverview(argThat(f -> Long.valueOf(30L).equals(f.jobId()))))
                .thenReturn(new JobOverviewResponse(
                        30L, "Backend Engineer", "PUBLISHED", "Engineering", "AUTO",
                        3, 1L, 1L, 12L, 18L, new BigDecimal("8.3"),
                        new BigDecimal("81.0"), 2L, 3L, 1L, 2L, null, null));
        when(service.pipeline(argThat(f -> Long.valueOf(30L).equals(f.jobId()))))
                .thenReturn(new PipelineResponse(12L, 1L, List.of(), List.of(), List.of()));
        when(service.quality(argThat(f -> f.jobId() == null)))
                .thenReturn(new QualityResponse(new BigDecimal("78.0"), List.of(), List.of(), null, List.of()));
        when(service.jobInsights(argThat(f -> Long.valueOf(30L).equals(f.jobId()))))
                .thenReturn(new JobInsightsResponse(
                        30L, 5L, List.of(),
                        new LossAnalysis(0, 0, 0, List.of(), List.of()),
                        new ProctorSummary(0, 0, 0, 0, 0, null, List.of()),
                        new HumanInterviewSummary(0, null, null, null, null, Map.of()),
                        new AiInterviewSummary(0, 0, 0, null, new BigDecimal("70.0"))));

        MockMvc mvc = MockMvcBuilders.standaloneSetup(new RecruiterAnalyticsController(service))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();

        mvc.perform(get("/api/v1/analytics/recruiter/job-overview").param("jobId", "30"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.jobId").value(30))
                .andExpect(jsonPath("$.data.hiredCount").value(1));

        mvc.perform(get("/api/v1/analytics/recruiter/pipeline").param("jobId", "30"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalCandidates").value(12));

        mvc.perform(get("/api/v1/analytics/recruiter/quality"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.talentQualityIndex").value(78.0));

        mvc.perform(get("/api/v1/analytics/recruiter/job-insights").param("jobId", "30"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.evaluatedCvCount").value(5));

        verify(service).jobOverview(argThat(f -> Long.valueOf(30L).equals(f.jobId())));
        verify(service).pipeline(argThat(f -> Long.valueOf(30L).equals(f.jobId())));
        verify(service).quality(argThat(f -> f.jobId() == null));
        verify(service).jobInsights(argThat(f -> Long.valueOf(30L).equals(f.jobId())));
    }
}

