package com.smarthire.tenant.dashboard;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.smarthire.tenant.dashboard.controller.DashboardController;
import com.smarthire.tenant.dashboard.dto.DashboardSummaryResponse;
import com.smarthire.tenant.dashboard.service.DashboardService;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class DashboardControllerTest {

    @Test
    void summaryEndpointReturnsDashboardData() throws Exception {
        DashboardService service = org.mockito.Mockito.mock(DashboardService.class);
        when(service.summary()).thenReturn(new DashboardSummaryResponse(4, 12, 3, new BigDecimal("25.0"), new BigDecimal("82.45")));
        MockMvc mvc = MockMvcBuilders.standaloneSetup(new DashboardController(service)).build();

        mvc.perform(get("/api/v1/dashboard/summary"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.openJobs").value(4))
                .andExpect(jsonPath("$.data.newApplicants").value(12));
    }
}
