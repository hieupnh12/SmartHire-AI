package com.smarthire.tenant.job.service;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.enums.JobStatus;
import com.smarthire.domain.tenant.entity.Candidate;
import com.smarthire.domain.tenant.entity.Job;
import com.smarthire.domain.tenant.entity.SavedJob;
import com.smarthire.domain.tenant.repository.JobRepository;
import com.smarthire.domain.tenant.repository.JobSkillRepository;
import com.smarthire.domain.tenant.repository.SavedJobRepository;
import com.smarthire.tenant.cv.service.CvAccess;
import com.smarthire.tenant.job.mapper.JobMapper;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class SavedJobServiceTest {

    private final CvAccess access = mock(CvAccess.class);
    private final SavedJobRepository savedJobs = mock(SavedJobRepository.class);
    private final JobRepository jobs = mock(JobRepository.class);
    private final JobSkillRepository jobSkills = mock(JobSkillRepository.class);
    private final SavedJobService service = new SavedJobService(access, savedJobs, jobs, jobSkills, new JobMapper());

    @Test
    void savePublishedJobCreatesBookmarkIdempotently() {
        Candidate candidate = new Candidate();
        candidate.setId(7L);
        Job job = new Job();
        job.setId(30L);
        job.setTitle("Java Developer");
        job.setStatus(JobStatus.PUBLISHED);
        job.setPublishedAt(Instant.now());

        when(access.candidateActor()).thenReturn(candidate);
        when(jobs.findById(30L)).thenReturn(Optional.of(job));
        when(savedJobs.findByCandidate_IdAndJob_Id(7L, 30L)).thenReturn(Optional.empty());
        when(savedJobs.save(any())).thenAnswer(inv -> {
            SavedJob row = inv.getArgument(0);
            row.setId(99L);
            return row;
        });
        when(jobSkills.findByJob_IdOrderByIdAsc(30L)).thenReturn(List.of());

        var view = service.save(30L);
        assertThat(view.id()).isEqualTo(99L);
        assertThat(view.job().id()).isEqualTo(30L);
    }

    @Test
    void saveClosedJobThrowsConflict() {
        Candidate candidate = new Candidate();
        candidate.setId(7L);
        Job closed = new Job();
        closed.setId(30L);
        closed.setStatus(JobStatus.CLOSED);

        when(access.candidateActor()).thenReturn(candidate);
        when(jobs.findById(30L)).thenReturn(Optional.of(closed));

        assertThatThrownBy(() -> service.save(30L))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getCode())
                .isEqualTo("JOB_NOT_OPEN");
    }
}

