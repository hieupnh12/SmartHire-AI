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
    private final com.smarthire.domain.tenant.repository.JobSkillRepository skills;
    private final com.smarthire.tenant.aiInterview.ai.AiInterviewClient ai;
    public AiInterviewConfigService(JobRepository jobs, ApplicationRepository applications, CvAccess access,
                                     AiInterviewInvitationService invitations, com.smarthire.domain.tenant.repository.JobSkillRepository skills,
                                     com.smarthire.tenant.aiInterview.ai.AiInterviewClient ai) {
        this.skills = skills; this.ai = ai;
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
        if (request.availableFrom() != null && request.availableUntil() != null
                && !request.availableFrom().isBefore(request.availableUntil())) {
            throw new BusinessException("Availability start must be before the deadline", HttpStatus.BAD_REQUEST,
                    "AI_INTERVIEW_BAD_CONFIG");
        }
        InterviewPolicies.requireCommunicationOnly(request.policy());
        InterviewPolicies.validate(request, jobSkills(id), request.enabled());
        var policy = InterviewPolicies.communicationPolicy(request.policy());
        job.setAiInterviewPolicyJson(InterviewPolicies.json(policy));
        job.setAiInterviewEnabled(request.enabled());
        job.setAiInterviewPassingScore(request.passingScore());
        job.setAiInterviewQuestionCount(request.questionCount());
        job.setAiInterviewAvailableFrom(request.availableFrom());
        job.setAiInterviewAvailableUntil(request.availableUntil());
        if (request.enabled()) {
            applications.findByJob_IdOrderByIdDesc(id).stream()
                    .filter(a -> a.getStatus() == ApplicationStatus.INTERVIEW && a.getCvScreeningStatus() == CvScreeningStatus.PASSED
                            && a.getArchivedAt() == null && a.getWithdrawnAt() == null)
                    .forEach(a -> invitations.invite(a.getId(), null));
        }
        return view(job);
    }
    public AiInterviewConfigRequest suggest(long id, AiInterviewConfigRequest request) {
        job(id);
        throw new BusinessException("Lộ trình nhiều quy trình sẽ được phát triển trong tương lai. Hãy cấu hình Communication.", HttpStatus.CONFLICT, "AI_INTERVIEW_PROCESS_UNAVAILABLE");
    }
    private java.util.Set<String> jobSkills(long id) {
        return skills.findByJob_IdOrderByIdAsc(id).stream().map(s -> s.getSkill().getName()).collect(java.util.stream.Collectors.toSet());
    }
    private Job job(long id) {
        var job = jobs.findById(id).orElseThrow(() -> new BusinessException("Job not found", HttpStatus.NOT_FOUND, "JOB_NOT_FOUND"));
        access.requireJob(job);
        return job;
    }
    private AiInterviewConfigRequest view(Job job) {
        return InterviewPolicies.config(job);
    }
}
