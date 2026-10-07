package com.smarthire.tenant.cv;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.common.exception.BusinessException;
import com.smarthire.common.storage.FileStorageService;
import com.smarthire.domain.tenant.entity.Cv;
import com.smarthire.domain.tenant.entity.User;
import com.smarthire.domain.tenant.repository.ApplicationRepository;
import com.smarthire.domain.tenant.repository.CvAnalysisRepository;
import com.smarthire.domain.tenant.repository.CvDocumentRepository;
import com.smarthire.domain.tenant.repository.CvExtractionRepository;
import com.smarthire.domain.tenant.repository.CvRepository;
import com.smarthire.domain.tenant.repository.CvSkillRepository;
import com.smarthire.domain.tenant.repository.JobRepository;
import com.smarthire.domain.tenant.repository.MatchScoreRepository;
import com.smarthire.domain.tenant.repository.RankingDataRepository;
import com.smarthire.domain.tenant.repository.UserRepository;
import com.smarthire.messaging.JobPublisher;
import com.smarthire.multitenancy.service.TenantRegistryService;
import com.smarthire.tenant.cv.dto.CvModels.BuilderPersonalInfo;
import com.smarthire.tenant.cv.dto.CvModels.CvBuilderData;
import com.smarthire.tenant.cv.mapper.CvMapper;
import com.smarthire.tenant.cv.service.CvAccess;
import com.smarthire.tenant.cv.service.CvBuilderPdfRenderer;
import com.smarthire.tenant.cv.service.CvMatchingService;
import com.smarthire.tenant.cv.service.CvPipelineService;
import com.smarthire.tenant.cv.service.CvService;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CvServiceTest {
    @Mock CvRepository cvs;
    @Mock JobRepository jobs;
    @Mock UserRepository users;
    @Mock ApplicationRepository applications;
    @Mock CvDocumentRepository documents;
    @Mock CvExtractionRepository extractions;
    @Mock CvSkillRepository cvSkills;
    @Mock CvAnalysisRepository analyses;
    @Mock MatchScoreRepository scores;
    @Mock RankingDataRepository rankingData;
    @Mock FileStorageService storage;
    @Mock JobPublisher publisher;
    @Mock CvAccess access;
    @Mock CvMapper mapper;
    @Mock CvMatchingService matching;
    @Mock CvPipelineService pipeline;
    @Mock TenantRegistryService tenants;
    @Mock CvBuilderPdfRenderer renderer;

    CvService service;

    @BeforeEach
    void setUp() {
        service = new CvService(
                cvs, jobs, users, applications, documents, extractions, cvSkills, analyses, scores,
                rankingData, storage, publisher, access, mapper, matching, pipeline, tenants,
                renderer, new ObjectMapper(), 10_485_760);
    }

    @Test
    void builderCannotEditUploadedCv() {
        User actor = new User();
        actor.setId(3L);
        Cv cv = new Cv();
        cv.setId(9L);
        cv.setUser(actor);
        when(access.candidate()).thenReturn(true);
        when(access.actor()).thenReturn(actor);
        when(cvs.findById(9L)).thenReturn(Optional.of(cv));

        assertThatThrownBy(() -> service.updateFromBuilder(9L, builderData()))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getCode())
                .isEqualTo("CV_NOT_BUILDER");
        verifyNoInteractions(renderer, storage);
    }

    @Test
    void builderCannotEditAnotherUsersCv() {
        User actor = new User();
        actor.setId(3L);
        User other = new User();
        other.setId(4L);
        Cv cv = new Cv();
        cv.setId(9L);
        cv.setUser(other);
        cv.setBuilderData("{}");
        when(access.candidate()).thenReturn(true);
        when(access.actor()).thenReturn(actor);
        when(cvs.findById(9L)).thenReturn(Optional.of(cv));

        assertThatThrownBy(() -> service.updateFromBuilder(9L, builderData()))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getCode())
                .isEqualTo("CV_FORBIDDEN");
    }

    @Test
    void renameKeepsFileExtension() {
        User actor = new User();
        actor.setId(3L);
        Cv cv = new Cv();
        cv.setId(9L);
        cv.setUser(actor);
        cv.setOriginalFilename("CV-Nguyen Van A.pdf");
        when(access.actor()).thenReturn(actor);
        when(cvs.findById(9L)).thenReturn(Optional.of(cv));

        service.rename(9L, "  CV Backend 2026 ");

        assertThat(cv.getOriginalFilename()).isEqualTo("CV Backend 2026.pdf");
    }

    @Test
    void shareCreatesStableTokenForBuilderCv() {
        User actor = new User();
        actor.setId(3L);
        Cv cv = new Cv();
        cv.setId(9L);
        cv.setUser(actor);
        cv.setBuilderData("{}");
        when(access.candidate()).thenReturn(true);
        when(access.actor()).thenReturn(actor);
        when(cvs.findById(9L)).thenReturn(Optional.of(cv));

        String token = service.share(9L).token();

        assertThat(token).hasSizeGreaterThanOrEqualTo(32).matches("[A-Za-z0-9_-]+");
        assertThat(service.share(9L).token()).isEqualTo(token);
    }

    @Test
    void unknownShareTokenIsNotFound() {
        when(cvs.findByShareToken("missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.shared("missing"))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getCode())
                .isEqualTo("CV_SHARE_NOT_FOUND");
    }

    private static CvBuilderData builderData() {
        return new CvBuilderData("basic", null, null, null,
                new BuilderPersonalInfo("Nguyễn Văn A", null, null, null, null, null, null, null, null, null, null, null, null), List.of());
    }

    @Test
    void staffCannotUploadCv() {
        when(access.candidate()).thenReturn(false);
        MockMultipartFile file = new MockMultipartFile("file", "cv.pdf", "application/pdf", new byte[] { 1, 2, 3 });

        assertThatThrownBy(() -> service.upload(file, 1L, null, null))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Only candidates")
                .extracting(ex -> ((BusinessException) ex).getCode())
                .isEqualTo("CV_UPLOAD_CANDIDATE_ONLY");
    }

    @Test
    void deleteRemovesChildrenAndFile() throws Exception {
        Cv cv = new Cv();
        cv.setId(7L);
        cv.setStorageKey("ttqt/7/cv.pdf");
        when(cvs.findById(7L)).thenReturn(Optional.of(cv));

        service.delete(7L);

        verify(scores).deleteByCv_Id(7L);
        verify(cvSkills).deleteByCv_Id(7L);
        verify(analyses).deleteByCv_Id(7L);
        verify(extractions).deleteByCv_Id(7L);
        verify(documents).deleteByCv_Id(7L);
        verify(rankingData).detachCv(7L);
        verify(cvs).delete(cv);
        verify(storage).delete("ttqt/7/cv.pdf");
    }
}
