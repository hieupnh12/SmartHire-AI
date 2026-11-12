package com.smarthire.tenant.job.service;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.tenant.entity.Candidate;
import com.smarthire.domain.tenant.entity.Job;
import com.smarthire.domain.tenant.entity.SavedJob;
import com.smarthire.domain.tenant.repository.JobRepository;
import com.smarthire.domain.tenant.repository.JobSkillRepository;
import com.smarthire.domain.tenant.repository.SavedJobRepository;
import com.smarthire.tenant.cv.service.CvAccess;
import com.smarthire.tenant.job.dto.SavedJobModels.SavedJobView;
import com.smarthire.tenant.job.mapper.JobMapper;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SavedJobService {

    private final CvAccess access;
    private final SavedJobRepository savedJobs;
    private final JobRepository jobs;
    private final JobSkillRepository jobSkills;
    private final JobMapper mapper;

    public SavedJobService(
            CvAccess access,
            SavedJobRepository savedJobs,
            JobRepository jobs,
            JobSkillRepository jobSkills,
            JobMapper mapper) {
        this.access = access;
        this.savedJobs = savedJobs;
        this.jobs = jobs;
        this.jobSkills = jobSkills;
        this.mapper = mapper;
    }

    @Transactional(readOnly = true)
    public List<SavedJobView> list() {
        Candidate candidate = access.candidateActor();
        return savedJobs.findDetailedByCandidateId(candidate.getId()).stream()
                .map(row -> toView(row, row.getJob()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<Long> listIds() {
        Candidate candidate = access.candidateActor();
        return savedJobs.findJobIdsByCandidateId(candidate.getId());
    }

    @Transactional
    public SavedJobView save(long jobId) {
        Candidate candidate = access.candidateActor();
        Job job = jobs.findById(jobId)
                .filter(item -> item.getDeletedAt() == null)
                .orElseThrow(() -> new BusinessException("Job not found", HttpStatus.NOT_FOUND, "JOB_NOT_FOUND"));
        if (!mapper.accepting(job)) {
            throw new BusinessException("Tin tuyển dụng hiện không mở để lưu", HttpStatus.CONFLICT, "JOB_NOT_OPEN");
        }
        SavedJob saved = savedJobs.findByCandidate_IdAndJob_Id(candidate.getId(), jobId)
                .orElseGet(() -> savedJobs.save(SavedJob.builder()
                        .candidate(candidate)
                        .job(job)
                        .build()));
        return toView(saved, job);
    }

    @Transactional
    public void remove(long jobId) {
        Candidate candidate = access.candidateActor();
        savedJobs.deleteByCandidate_IdAndJob_Id(candidate.getId(), jobId);
    }

    private SavedJobView toView(SavedJob row, Job job) {
        return new SavedJobView(
                row.getId(),
                mapper.publicJob(job, jobSkills.findByJob_IdOrderByIdAsc(job.getId())),
                row.getCreatedAt());
    }
}

