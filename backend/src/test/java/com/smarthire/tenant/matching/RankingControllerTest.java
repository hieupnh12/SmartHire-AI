package com.smarthire.tenant.matching;

import com.smarthire.common.exception.*;
import com.smarthire.tenant.matching.controller.RankingController;
import com.smarthire.tenant.matching.dto.RankingModels.JobOption;
import com.smarthire.tenant.matching.service.RankingService;
import java.util.List;
import org.junit.jupiter.api.*;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class RankingControllerTest {
    private final RankingService service = mock(RankingService.class);
    private final MockMvc mvc = MockMvcBuilders.standaloneSetup(new RankingController(service))
            .setControllerAdvice(new GlobalExceptionHandler()).build();
    @Test void returnsApiEnvelope() throws Exception {
        when(service.jobs()).thenReturn(List.of(new JobOption(1, "Backend")));
        mvc.perform(get("/api/v1/rankings/jobs")).andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true)).andExpect(jsonPath("$.data[0].id").value(1));
    }
    @Test void validatesNestedWeightAndNullSourceBeforeService() throws Exception {
        mvc.perform(put("/api/v1/jobs/1/rankings/config").contentType(MediaType.APPLICATION_JSON).content("""
                {"weights":{"skills":101,"experience":0,"assessment":0,"interview":0},"groups":{"backend":100},"requiredExperienceMonths":0,"revision":0}
                """)).andExpect(status().isBadRequest());
        mvc.perform(put("/api/v1/applications/1/ranking-sources").contentType(MediaType.APPLICATION_JSON)
                .content("{\"cvId\":-1}")).andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }
    @Test void mapsForbiddenAndMissingJob() throws Exception {
        when(service.jobs()).thenThrow(new BusinessException("Forbidden", HttpStatus.FORBIDDEN, "RANKING_FORBIDDEN"));
        mvc.perform(get("/api/v1/rankings/jobs")).andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("RANKING_FORBIDDEN"));
        when(service.page(eq(99L), eq(0), eq(20), eq(""), eq("ACTIVE"), eq("ALL"), isNull(), eq("score")))
                .thenThrow(new BusinessException("Job not found", HttpStatus.NOT_FOUND, "JOB_NOT_FOUND"));
        mvc.perform(get("/api/v1/jobs/99/rankings")).andExpect(status().isNotFound());
    }
}
