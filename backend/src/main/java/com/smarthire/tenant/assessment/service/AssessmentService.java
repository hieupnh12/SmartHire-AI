package com.smarthire.tenant.assessment.service;

import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.enums.TestStatus;
import com.smarthire.domain.tenant.entity.JobTest;
import com.smarthire.domain.tenant.repository.JobRepository;
import com.smarthire.domain.tenant.repository.JobTestRepository;
import com.smarthire.tenant.cv.service.CvAccess;
import com.smarthire.tenant.assessment.dto.request.JobTestRequest;
import com.smarthire.tenant.assessment.dto.response.JobTestResponse;
import com.smarthire.tenant.assessment.dto.response.JobTestPage;
import com.smarthire.tenant.assessment.mapper.AssessmentMapper;

@Service
public class AssessmentService {
    private final JobTestRepository tests;
    private final JobRepository jobs;
    private final CvAccess access;
    private final AssessmentMapper mapper;

    public AssessmentService(JobTestRepository tests, JobRepository jobs, CvAccess access, AssessmentMapper mapper) {
        this.tests = tests;
        this.jobs = jobs;
        this.access = access;
        this.mapper = mapper;
    }

    @Transactional
    public JobTestResponse create(JobTestRequest request) {
        requireStaff();
        var job = jobs.findById(request.jobId()).orElseThrow(() ->
                new BusinessException("Job not found", HttpStatus.NOT_FOUND, "JOB_NOT_FOUND"));
        access.requireJob(job);
        JobTest test = new JobTest();
        test.setJob(job);
        test.setStatus(TestStatus.DRAFT);
        apply(test, request);
        return mapper.response(tests.save(test));
    }

    @Transactional(readOnly = true)
    public JobTestPage list(int page, int size) {
        requireStaff();
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 50);
        var result = tests.findAll(PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.DESC, "id")));
        return new JobTestPage(result.map(mapper::response).getContent(), result.getTotalElements(), safePage, safeSize);
    }

    @Transactional(readOnly = true)
    public JobTestResponse get(long id) {
        requireStaff();
        return mapper.response(find(id));
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public JobTestResponse update(long id, JobTestRequest request) {
        requireStaff();
        JobTest test = tests.findLockedById(id).orElseThrow(() ->
                new BusinessException("Test not found", HttpStatus.NOT_FOUND, "TEST_NOT_FOUND"));
        access.requireJob(test.getJob());
        if (test.getStatus() != TestStatus.DRAFT) {
            throw new BusinessException("Only draft tests can be edited", HttpStatus.CONFLICT, "TEST_LOCKED");
        }
        if (!test.getJob().getId().equals(request.jobId())) {
            throw new BusinessException("The test job cannot be changed", HttpStatus.CONFLICT, "TEST_JOB_IMMUTABLE");
        }
        apply(test, request);
        return mapper.response(tests.save(test));
    }

    private JobTest find(long id) {
        return tests.findById(id).orElseThrow(() ->
                new BusinessException("Test not found", HttpStatus.NOT_FOUND, "TEST_NOT_FOUND"));
    }

    private void requireStaff() {
        if (!access.staff()) {
            throw new BusinessException("Staff access required", HttpStatus.FORBIDDEN, "ASSESSMENT_FORBIDDEN");
        }
        access.actor();
    }

    private void apply(JobTest test, JobTestRequest request) {
        test.setTitle(request.title().trim());
        test.setDescription(request.description());
        test.setDurationMinutes(request.durationMinutes());
        test.setPassingScore(request.passingScore());
    }

    public Map<String, String> health() {
        return Map.of("module", "assessment", "status", "scaffold");
    }
}

