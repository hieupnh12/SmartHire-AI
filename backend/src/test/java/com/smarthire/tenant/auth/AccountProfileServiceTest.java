package com.smarthire.tenant.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.common.exception.BusinessException;
import com.smarthire.common.storage.FileStorageService;
import com.smarthire.domain.master.entity.TenantInfo;
import com.smarthire.domain.tenant.entity.Candidate;
import com.smarthire.domain.tenant.repository.CandidateRepository;
import com.smarthire.multitenancy.context.TenantContext;
import com.smarthire.multitenancy.service.TenantRegistryService;
import com.smarthire.tenant.auth.dto.AccountProfileModels.AccountProfileResponse;
import com.smarthire.tenant.auth.dto.AccountProfileModels.ProfileLinks;
import com.smarthire.tenant.auth.dto.AccountProfileModels.UpdateAccountProfileRequest;
import com.smarthire.tenant.auth.service.AccountProfileService;
import com.smarthire.tenant.cv.service.CvAccess;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

class AccountProfileServiceTest {

    private final CvAccess access = mock(CvAccess.class);
    private final CandidateRepository candidates = mock(CandidateRepository.class);
    private final FileStorageService storage = mock(FileStorageService.class);
    private final TenantRegistryService tenants = mock(TenantRegistryService.class);
    private final AccountProfileService service = new AccountProfileService(
            access, candidates, storage, tenants, new ObjectMapper());

    @AfterEach
    void clearTenant() {
        TenantContext.clear();
    }

    @Test
    void updateTrimsValuesAndSavesCandidate() {
        Candidate candidate = new Candidate();
        candidate.setId(7L);
        candidate.setEmail("candidate@acme.com");
        candidate.setFullName("Old");
        when(access.candidateActor()).thenReturn(candidate);
        when(candidates.save(candidate)).thenReturn(candidate);

        AccountProfileResponse response = service.update(
                new UpdateAccountProfileRequest(
                        "  Hiếu Nguyễn  ",
                        " 0901 234 567 ",
                        "  ",
                        "Java dev",
                        new ProfileLinks(" https://github.com/hieu ", "", "https://hieu.dev", null)));

        assertThat(response.fullName()).isEqualTo("Hiếu Nguyễn");
        assertThat(response.role()).isEqualTo("CANDIDATE");
        assertThat(response.phone()).isEqualTo("0901234567");
        assertThat(response.headline()).isNull();
        assertThat(response.bio()).isEqualTo("Java dev");
        assertThat(response.links().github()).isEqualTo("https://github.com/hieu");
        assertThat(response.links().linkedin()).isNull();
        assertThat(response.links().portfolio()).isEqualTo("https://hieu.dev");
        assertThat(response.hasPassword()).isFalse();
        verify(candidates).save(candidate);
    }

    @Test
    void invalidProfileLinkSchemeIsRejected() {
        Candidate candidate = new Candidate();
        candidate.setId(7L);
        when(access.candidateActor()).thenReturn(candidate);

        assertThatThrownBy(() -> service.update(
                new UpdateAccountProfileRequest("Name", null, null, null,
                        new ProfileLinks("javascript:alert(1)", null, null, null))))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getCode())
                .isEqualTo("INVALID_PROFILE_LINK");
        verify(candidates, never()).save(any());
    }

    @Test
    void phoneUsedByAnotherCandidateIsRejected() {
        Candidate candidate = new Candidate();
        candidate.setId(7L);
        when(access.candidateActor()).thenReturn(candidate);
        when(candidates.existsByPhoneAndIdNot("0901234567", 7L)).thenReturn(true);

        assertThatThrownBy(() -> service.update(new UpdateAccountProfileRequest("Name", "+84 901-234-567", null, null, null)))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getCode())
                .isEqualTo("PHONE_ALREADY_USED");
        verify(candidates, never()).save(any());
    }

    @Test
    void uploadAndRemoveAvatarUpdatesCandidateAvatarUrl() throws Exception {
        Candidate candidate = new Candidate();
        candidate.setId(7L);
        candidate.setEmail("candidate@acme.com");
        candidate.setFullName("Candidate");
        when(access.candidateActor()).thenReturn(candidate);
        when(candidates.save(candidate)).thenReturn(candidate);
        TenantContext.setCurrentTenant("se36");
        TenantInfo tenant = new TenantInfo();
        tenant.setSubdomain("se36");
        when(tenants.requireActive("se36")).thenReturn(tenant);
        when(storage.storeImage(eq("se36"), any())).thenReturn("https://cdn.example.com/avatar.png");

        MockMultipartFile file = new MockMultipartFile("file", "avatar.png", "image/png", new byte[]{1, 2, 3, 4});
        AccountProfileResponse uploaded = service.uploadAvatar(file);
        assertThat(uploaded.avatarUrl()).isEqualTo("https://cdn.example.com/avatar.png");

        AccountProfileResponse removed = service.removeAvatar();
        assertThat(removed.avatarUrl()).isNull();
    }

    @Test
    void uploadAvatarRejectsUnsupportedMimeType() {
        Candidate candidate = new Candidate();
        candidate.setId(7L);
        when(access.candidateActor()).thenReturn(candidate);
        MockMultipartFile bad = new MockMultipartFile("file", "doc.pdf", "application/pdf", new byte[]{1, 2, 3});

        assertThatThrownBy(() -> service.uploadAvatar(bad))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getCode())
                .isEqualTo("PROFILE_AVATAR_TYPE_REJECTED");
        verifyNoInteractions(storage);
    }

    @Test
    void currentRequiresSignedInCandidate() {
        when(access.candidateActor()).thenThrow(new BusinessException("Candidate not found", HttpStatus.UNAUTHORIZED, "USER_NOT_FOUND"));

        assertThatThrownBy(service::current).isInstanceOf(BusinessException.class);
        verifyNoInteractions(candidates);
    }
}
