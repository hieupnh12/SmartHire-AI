package com.smarthire.tenant.aiInterview.service;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.enums.ApplicationStatus;
import com.smarthire.domain.enums.CvScreeningStatus;
import com.smarthire.domain.tenant.entity.Job;
import com.smarthire.domain.tenant.repository.JobRepository;
import com.smarthire.domain.tenant.repository.ApplicationRepository;
import com.smarthire.tenant.aiInterview.dto.request.AiInterviewConfigRequest;
import com.smarthire.tenant.cv.service.CvAccess;
import java.time.Instant;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AiInterviewConfigService {
    private final JobRepository jobs;
    private final ApplicationRepository applications;
    private final CvAccess access;
    private final AiInterviewInvitationService invitations;
    public AiInterviewConfigService(JobRepository jobs, ApplicationRepository applications, CvAccess access,
                                     AiInterviewInvitationService invitations) {
        this.jobs = jobs; this.applications = applications; this.access = access; this.invitations = invitations;
    }
    @Transactional(readOnly = true)
    public AiInterviewConfigRequest get(long id) { return view(job(id)); }

    @Transactional
    public AiInterviewConfigRequest update(long id, AiInterviewConfigRequest request) {
        Job job = job(id);
        if (request.enabled() && request.availableUntil() != null && !request.availableUntil().isAfter(Instant.now())) {
            throw new BusinessException("Availability deadline must be in the future", HttpStatus.BAD_REQUEST, "AI_INTERVIEW_BAD_CONFIG");
        }
        job.setAiInterviewEnabled(request.enabled());
        job.setAiInterviewPassingScore(request.passingScore());
        job.setAiInterviewQuestionCount(request.questionCount());
        job.setAiInterviewAvailableUntil(request.availableUntil());
        if (request.enabled()) {
            applications.findByJob_IdOrderByIdDesc(id).stream()
                    .filter(a -> a.getStatus() == ApplicationStatus.INTERVIEW && a.getCvScreeningStatus() == CvScreeningStatus.PASSED
                            && a.getArchivedAt() == null && a.getWithdrawnAt() == null)
                    .forEach(a -> invitations.invite(a.getId(), null));
        }
        return view(job);
    }
    private Job job(long id) {
        var job = jobs.findById(id).orElseThrow(() -> new BusinessException("Job not found", HttpStatus.NOT_FOUND, "JOB_NOT_FOUND"));
        access.requireJob(job);
        return job;
    }
    private AiInterviewConfigRequest view(Job job) {
        return new AiInterviewConfigRequest(job.isAiInterviewEnabled(), job.getAiInterviewPassingScore(),
                job.getAiInterviewQuestionCount(), job.getAiInterviewAvailableUntil());
    }
}
