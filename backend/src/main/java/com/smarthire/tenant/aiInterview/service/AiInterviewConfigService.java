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
        InterviewPolicies.validate(request, jobSkills(id), request.enabled());
        job.setAiInterviewPolicyJson(InterviewPolicies.json(request.policy()));
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
    public AiInterviewConfigRequest suggest(long id, AiInterviewConfigRequest request) {
        Job job = job(id);
        var draft = request.policy();
        var constraints = new com.smarthire.tenant.aiInterview.dto.request.InterviewPolicy(draft.durationMinutes(), draft.maxAttempts(),
                draft.miniAssessmentEnabled(), draft.miniQuestionCount(), draft.miniWeight(), 0,
                draft.weights(), draft.selectedSkills(), java.util.List.of());
        // A previous roadmap may no longer match the edited count or skills; validate the new constraints first.
        InterviewPolicies.validate(new AiInterviewConfigRequest(request.enabled(), request.passingScore(),
                request.questionCount(), request.availableUntil(), constraints), jobSkills(id), false);
        var data = new com.fasterxml.jackson.databind.ObjectMapper().createObjectNode();
        data.put("jobTitle", job.getTitle()).put("jobDescription", job.getDescription())
                .put("responsibilities", job.getResponsibilities());
        data.set("configuration", InterviewPolicies.tree(InterviewPolicies.json(request)));
        try {
            var output = ai.generate("Propose a Vietnamese interview roadmap. Return {\"stages\":[{\"title\":\"...\",\"questionCount\":1,\"competencies\":[\"TECHNICAL_KNOWLEDGE\"],\"skills\":[\"Java\"]}]}. "
                    + "Use only selectedSkills and positive-weight competency keys. Cover every selected skill and positive-weight competency. "
                    + "Stage question counts must sum to configuration.questionCount. At most 20 stages. No questions or answers.", data);
            var stages = java.util.Arrays.asList(InterviewPolicies.read(output.path("stages").toString(), com.smarthire.tenant.aiInterview.dto.request.InterviewPolicy.Stage[].class));
            var p = request.policy();
            var proposed = new com.smarthire.tenant.aiInterview.dto.request.InterviewPolicy(p.durationMinutes(), p.maxAttempts(), p.miniAssessmentEnabled(),
                    p.miniQuestionCount(), p.miniWeight(), Math.min(p.miniAfterStage(), stages.size()), p.weights(), p.selectedSkills(), stages);
            var result = new AiInterviewConfigRequest(request.enabled(), request.passingScore(), request.questionCount(), request.availableUntil(), proposed);
            try (var validator = jakarta.validation.Validation.buildDefaultValidatorFactory()) {
                if (!validator.getValidator().validate(result).isEmpty()) throw new IllegalStateException("AI returned an invalid roadmap");
            }
            InterviewPolicies.validate(result, jobSkills(id), true);
            return result;
        } catch (BusinessException ex) {
            throw ex;
        } catch (com.smarthire.tenant.aiInterview.ai.AiInterviewClient.ProviderException ex) {
            throw new BusinessException(ex.getMessage(), HttpStatus.SERVICE_UNAVAILABLE, "AI_INTERVIEW_PROVIDER");
        } catch (RuntimeException ex) {
            throw new BusinessException("Không tạo được lộ trình hợp lệ. Hãy chỉnh cấu hình và thử lại.", HttpStatus.BAD_REQUEST, "AI_INTERVIEW_BAD_CONFIG");
        }
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
