package com.smarthire.tenant.assessment.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.domain.tenant.entity.User;
import com.smarthire.tenant.assessment.dto.request.CodingRequest;
import com.smarthire.tenant.assessment.dto.request.CodingVerificationRequest;
import com.smarthire.tenant.cv.service.CvAccess;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class CodingVerificationServiceTest {
    final ObjectMapper json = new ObjectMapper();
    final CvAccess access = mock(CvAccess.class);
    final CodingJudge judge = mock(CodingJudge.class);
    final CodingVerificationService service = new CodingVerificationService(access, judge);

    CodingRequest coding(int secondWeight) throws Exception {
        return new CodingRequest("CODING_ALGORITHM", 2000, 256, json.readTree("{\"cpp\":\"\"}"),
                json.readTree("{\"cpp\":\"{{SOURCE}}\"}"), List.of(
                    new CodingRequest.Case("1", "2", true, BigDecimal.ZERO),
                    new CodingRequest.Case("2", "4", false, new BigDecimal("70")),
                    new CodingRequest.Case("3", "6", false, BigDecimal.valueOf(secondWeight))), "Double input");
    }

    @Test void verifiesAllSampleAndHiddenTestsWithoutSaving() throws Exception {
        when(access.staff()).thenReturn(true);
        when(access.actor()).thenReturn(new User());
        when(judge.run(any(), eq("cpp"), eq("source"), anyString(), anyString())).thenReturn(json.readTree("{\"status\":{\"id\":3,\"description\":\"Accepted\"}}"));
        var results = service.verify(new CodingVerificationRequest(coding(30), "cpp", "source"));
        assertThat(results).hasSize(3);
        verify(judge, times(3)).run(argThat(problem -> problem.getTitle().equals("Double input")
                && problem.getTestCases().get(1).getWeight().compareTo(new BigDecimal("70")) == 0), eq("cpp"), eq("source"), anyString(), anyString());
    }

    @Test void deniesCandidateBeforeSandboxExecution() throws Exception {
        assertThatThrownBy(() -> service.verify(new CodingVerificationRequest(coding(30), "cpp", "source")))
                .hasMessageContaining("Staff access required");
        verifyNoInteractions(judge);
    }

    @Test void rejectsInvalidHiddenWeightTotal() throws Exception {
        when(access.staff()).thenReturn(true);
        assertThatThrownBy(() -> service.verify(new CodingVerificationRequest(coding(20), "cpp", "source")))
                .hasMessageContaining("totaling 100");
        verifyNoInteractions(judge);
    }

    @Test void reportsProviderFailureWithoutReturningSuccessfulResults() throws Exception {
        when(access.staff()).thenReturn(true);
        when(judge.run(any(), anyString(), anyString(), anyString(), anyString())).thenThrow(new IllegalStateException("Unavailable"));
        assertThatThrownBy(() -> service.verify(new CodingVerificationRequest(coding(30), "cpp", "source")))
                .hasMessageContaining("sandbox unavailable");
    }
}
