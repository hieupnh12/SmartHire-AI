package com.smarthire.tenant.cv.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.smarthire.common.redis.RedisService;
import com.smarthire.common.storage.FileStorageService;
import com.smarthire.domain.tenant.entity.Cv;
import com.smarthire.domain.tenant.entity.Job;
import com.smarthire.domain.tenant.entity.MatchScore;
import com.smarthire.domain.tenant.repository.CvDocumentRepository;
import com.smarthire.domain.tenant.repository.CvExtractionRepository;
import com.smarthire.domain.tenant.repository.CvRepository;
import com.smarthire.domain.tenant.repository.JobSkillRepository;
import com.smarthire.messaging.JobPublisher;
import com.smarthire.multitenancy.quota.TenantQuotaRedisService;
import com.smarthire.tenant.applicant.service.ApplicantService;
import com.smarthire.tenant.cv.ai.CvAiClient;
import com.smarthire.tenant.cv.github.GithubAnalysisService;
import com.smarthire.tenant.cv.parse.CvDocumentParser;
import com.smarthire.tenant.job.screening.GateScreeningService;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class CvPipelineGithubTest {
    @Test
    void githubPublishFailureDoesNotFailCvScreening() {
        CvRepository cvs = mock(CvRepository.class);
        CvMatchingService matching = mock(CvMatchingService.class);
        ApplicantService applicants = mock(ApplicantService.class);
        JobPublisher publisher = mock(JobPublisher.class);
        RedisService redis = mock(RedisService.class);
        GithubAnalysisService github = mock(GithubAnalysisService.class);
        CvPipelineService pipeline = new CvPipelineService(
                cvs, mock(CvDocumentRepository.class), mock(CvExtractionRepository.class), mock(FileStorageService.class),
                mock(CvDocumentParser.class), mock(CvAiClient.class), mock(CvSkillAnalysisService.class), matching,
                applicants, mock(GateScreeningService.class), publisher, redis, mock(JobSkillRepository.class),
                mock(TenantQuotaRedisService.class), github);
        Cv cv = new Cv();
        cv.setId(9L);
        cv.setJob(new Job());
        when(redis.setIfAbsent(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any())).thenReturn(true);
        when(cvs.findById(9L)).thenReturn(Optional.of(cv));
        when(matching.score(cv)).thenReturn(new MatchScore());
        org.mockito.Mockito.doThrow(new IllegalStateException("queue down")).when(publisher).publishGithub(9L);

        assertThat(pipeline.match(9L, true)).isTrue();
        verify(matching).score(cv);
        verify(cvs, never()).save(org.mockito.ArgumentMatchers.any());
    }
}
