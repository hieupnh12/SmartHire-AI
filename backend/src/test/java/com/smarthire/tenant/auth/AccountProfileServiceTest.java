package com.smarthire.tenant.auth;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.tenant.entity.Candidate;
import com.smarthire.domain.tenant.repository.CandidateRepository;
import com.smarthire.tenant.auth.dto.AccountProfileModels.AccountProfileResponse;
import com.smarthire.tenant.auth.dto.AccountProfileModels.UpdateAccountProfileRequest;
import com.smarthire.tenant.auth.service.AccountProfileService;
import com.smarthire.tenant.cv.service.CvAccess;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

class AccountProfileServiceTest {

    private final CvAccess access = mock(CvAccess.class);
    private final CandidateRepository candidates = mock(CandidateRepository.class);
    private final AccountProfileService service = new AccountProfileService(access, candidates);

    @Test
    void updateTrimsValuesAndSavesCandidate() {
        Candidate candidate = new Candidate();
        candidate.setId(7L);
        candidate.setEmail("candidate@acme.com");
        candidate.setFullName("Old");
        when(access.candidateActor()).thenReturn(candidate);
        when(candidates.save(candidate)).thenReturn(candidate);

        AccountProfileResponse response = service.update(
                new UpdateAccountProfileRequest("  Hiếu Nguyễn  ", " 0901 234 567 ", "  ", "Java dev"));

        assertThat(response.fullName()).isEqualTo("Hiếu Nguyễn");
        assertThat(response.role()).isEqualTo("CANDIDATE");
        assertThat(response.phone()).isEqualTo("0901234567");
        assertThat(response.headline()).isNull();
        assertThat(response.bio()).isEqualTo("Java dev");
        assertThat(response.hasPassword()).isFalse();
        verify(candidates).save(candidate);
    }

    @Test
    void phoneUsedByAnotherCandidateIsRejected() {
        Candidate candidate = new Candidate();
        candidate.setId(7L);
        when(access.candidateActor()).thenReturn(candidate);
        when(candidates.existsByPhoneAndIdNot("0901234567", 7L)).thenReturn(true);

        assertThatThrownBy(() -> service.update(new UpdateAccountProfileRequest("Name", "+84 901-234-567", null, null)))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getCode())
                .isEqualTo("PHONE_ALREADY_USED");
        verify(candidates, never()).save(any());
    }

    @Test
    void currentRequiresSignedInCandidate() {
        when(access.candidateActor()).thenThrow(new BusinessException("Candidate not found", HttpStatus.UNAUTHORIZED, "USER_NOT_FOUND"));

        assertThatThrownBy(service::current).isInstanceOf(BusinessException.class);
        verifyNoInteractions(candidates);
    }
}
