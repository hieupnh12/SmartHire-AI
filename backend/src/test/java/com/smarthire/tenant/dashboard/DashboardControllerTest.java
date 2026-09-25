package com.smarthire.tenant.dashboard;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.smarthire.tenant.dashboard.controller.DashboardController;
import com.smarthire.tenant.dashboard.dto.DashboardSummaryResponse;
import com.smarthire.tenant.dashboard.dto.DashboardActionItemsResponse;
import com.smarthire.tenant.dashboard.dto.DashboardChartsResponse;
import com.smarthire.tenant.dashboard.dto.DashboardTrendPoint;
import com.smarthire.tenant.dashboard.service.DashboardService;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class DashboardControllerTest {

    @Test
    void summaryEndpointReturnsDashboardData() throws Exception {
        DashboardService service = org.mockito.Mockito.mock(DashboardService.class);
        when(service.summary()).thenReturn(new DashboardSummaryResponse(
                4, 12, 3, new BigDecimal("25.0"), new BigDecimal("82.45"),
                9, 4, 2, 1, 2, 20, new BigDecimal("5.0"), 7));
        MockMvc mvc = MockMvcBuilders.standaloneSetup(new DashboardController(service)).build();

        mvc.perform(get("/api/v1/dashboard/summary"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.openJobs").value(4))
                .andExpect(jsonPath("$.data.newApplicants").value(12));
    }

    @Test
    void dashboardSupportingEndpointsReturnData() throws Exception {
        DashboardService service = org.mockito.Mockito.mock(DashboardService.class);
        when(service.actionItems()).thenReturn(new DashboardActionItemsResponse(12, 7, 3, 1, 2));
        when(service.charts(null, null)).thenReturn(new DashboardChartsResponse(List.of(), List.of(), List.of()));
        when(service.trends(null, null, "DAY")).thenReturn(List.of(new DashboardTrendPoint("2026-09-25", 4, 1, new BigDecimal("80"))));
        MockMvc mvc = MockMvcBuilders.standaloneSetup(new DashboardController(service)).build();

        mvc.perform(get("/api/v1/dashboard/action-items"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.pendingCvScreening").value(7));
        mvc.perform(get("/api/v1/dashboard/charts"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.funnel").isArray());
        mvc.perform(get("/api/v1/dashboard/trends"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].applications").value(4));
    }
}
