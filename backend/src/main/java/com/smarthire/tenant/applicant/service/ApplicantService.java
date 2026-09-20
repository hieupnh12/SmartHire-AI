package com.smarthire.tenant.applicant.service;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.enums.ApplicationStatus;
import com.smarthire.domain.enums.UserRole;
import com.smarthire.domain.enums.UserStatus;
import com.smarthire.domain.tenant.entity.Application;
import com.smarthire.domain.tenant.entity.ApplicationStatusHistory;
import com.smarthire.domain.tenant.entity.Cv;
import com.smarthire.domain.tenant.entity.Job;
import com.smarthire.domain.tenant.entity.MatchScore;
import com.smarthire.domain.tenant.entity.User;
import com.smarthire.domain.tenant.repository.ApplicationRepository;
import com.smarthire.domain.tenant.repository.ApplicationStatusHistoryRepository;
import com.smarthire.domain.tenant.repository.CvRepository;
import com.smarthire.domain.tenant.repository.JobRepository;
import com.smarthire.domain.tenant.repository.RecruitmentStageRepository;
import com.smarthire.domain.tenant.repository.UserRepository;
import com.smarthire.tenant.applicant.dto.ApplicantModels.ApplicationDetail;
import com.smarthire.tenant.applicant.dto.ApplicantModels.ApplicationSummary;
import com.smarthire.tenant.applicant.dto.ApplicantModels.HistoryView;
import com.smarthire.tenant.applicant.dto.ApplicantModels.ManualCreateRequest;
import com.smarthire.tenant.applicant.dto.ApplicantModels.PageResult;
import com.smarthire.tenant.applicant.dto.ApplicantModels.PatchRequest;
import com.smarthire.tenant.applicant.mapper.ApplicantMapper;
import com.smarthire.tenant.cv.service.CvAccess;
import com.smarthire.tenant.job.mapper.JobMapper;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ApplicantService {
    private static final Set<ApplicationStatus> TERMINAL = Set.of(ApplicationStatus.HIRED);
    private final ApplicationRepository applications;
    private final ApplicationStatusHistoryRepository history;
    private final JobRepository jobs;
    private final UserRepository users;
    private final CvRepository cvs;
    private final RecruitmentStageRepository stages;
    private final CvAccess access;
    private final JobMapper jobsMapper;
    private final ApplicantMapper mapper;

    public ApplicantService(
            ApplicationRepository applications,
            ApplicationStatusHistoryRepository history,
            JobRepository jobs,
            UserRepository users,
            CvRepository cvs,
            RecruitmentStageRepository stages,
            CvAccess access,
            JobMapper jobsMapper,
            ApplicantMapper mapper) {
        this.applications = applications;
        this.history = history;
        this.jobs = jobs;
        this.users = users;
        this.cvs = cvs;
        this.stages = stages;
        this.access = access;
        this.jobsMapper = jobsMapper;
        this.mapper = mapper;
    }

    public Map<String, String> health() {
        return Map.of("module", "applicant", "status", "ready");
    }

    @Transactional
    public ApplicationSummary apply(long jobId, String source, String referralCode) {
        return apply(jobId, source, referralCode, null);
    }

    @Transactional
    public ApplicationSummary apply(long jobId, String source, String referralCode, Long cvId) {
        if (!access.candidate()) {
            throw new BusinessException("Only candidates can apply", HttpStatus.FORBIDDEN, "APPLICATION_CANDIDATE_ONLY");
        }
        Job job = job(jobId);
        if (!jobsMapper.accepting(job)) {
            throw new BusinessException("Job is not open for applications", HttpStatus.BAD_REQUEST, "JOB_NOT_PUBLISHED");
        }
        User actor = access.actor();
        var existing = applications.findByJob_IdAndCandidate_Id(jobId, actor.getId());
        if (existing.isPresent()) {
            Application current = existing.get();
            if (current.getStatus() == ApplicationStatus.WITHDRAWN) {
                current.setWithdrawnAt(null);
                current.setArchivedAt(null);
                attachCv(cvId, job, current, actor);
                record(current, ApplicationStatus.NEW, "Re-applied");
                return mapper.summary(current, false);
            }
            throw new BusinessException("Already applied to this job", HttpStatus.CONFLICT, "APPLICATION_EXISTS");
        }
        Application application = new Application();
        application.setJob(job);
        application.setCandidate(actor);
        application.setStatus(ApplicationStatus.NEW);
        application.setSource(blankToValue(source, "CAREER"));
        application.setReferralCode(blankToNull(referralCode));
        application.setStage(stages.findByJob_IdOrderBySortOrderAsc(jobId).stream().findFirst().orElse(null));
        applications.save(application);
        attachCv(cvId, job, application, actor);
        record(application, ApplicationStatus.NEW, "Applied");
        return mapper.summary(application, false);
    }

    @Transactional
    public ApplicationSummary createManual(long jobId, ManualCreateRequest request) {
        Job job = job(jobId);
        access.requireJob(job);
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        User candidate = users.findByEmailIgnoreCase(email).orElse(null);
        if (candidate == null) {
            candidate = new User();
            candidate.setEmail(email);
            candidate.setFullName(request.fullName().trim());
            candidate.setRole(UserRole.CANDIDATE);
            candidate.setStatus(UserStatus.ACTIVE);
            users.save(candidate);
        } else if (candidate.getRole() != UserRole.CANDIDATE) {
            throw new BusinessException("Email belongs to a staff account", HttpStatus.BAD_REQUEST, "EMAIL_NOT_CANDIDATE");
        }
        var existing = applications.findByJob_IdAndCandidate_Id(jobId, candidate.getId());
        if (existing.isPresent()) {
            throw new BusinessException("Candidate already applied to this job", HttpStatus.CONFLICT, "APPLICATION_EXISTS");
        }
        Application application = new Application();
        application.setJob(job);
        application.setCandidate(candidate);
        application.setStatus(ApplicationStatus.NEW);
        application.setSource(blankToValue(request.source(), "MANUAL"));
        application.setReferralCode(blankToNull(request.referralCode()));
        application.setNotes(blankToNull(request.notes()));
        application.setTags(blankToNull(request.tags()));
        application.setAssignee(access.actor());
        application.setStage(stages.findByJob_IdOrderBySortOrderAsc(jobId).stream().findFirst().orElse(null));
        applications.save(application);
        record(application, ApplicationStatus.NEW, "Created by recruiter");
        return mapper.summary(application, false);
    }

    @Transactional(readOnly = true)
    public PageResult<ApplicationSummary> list(long jobId, String q, ApplicationStatus status, String source, boolean archived, int page, int size) {
        access.requireJob(job(jobId));
        var result = applications.search(
                jobId,
                q == null ? null : q.trim(),
                status,
                blankToNull(source),
                archived,
                PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 50), Sort.by(Sort.Direction.DESC, "id")));
        List<ApplicationSummary> items = result.getContent().stream()
                .map(app -> mapper.summary(app, applications.countByCandidate_Id(app.getCandidate().getId()) > 1))
                .toList();
        return new PageResult<>(items, result.getNumber(), result.getSize(), result.getTotalElements());
    }

    @Transactional(readOnly = true)
    public List<ApplicationSummary> mine() {
        User actor = access.actor();
        return applications.findByCandidate_IdOrderByIdDesc(actor.getId()).stream()
                .filter(app -> app.getStatus() != ApplicationStatus.WITHDRAWN)
                .map(app -> mapper.summary(app, false))
                .toList();
    }

    @Transactional(readOnly = true)
    public ApplicationDetail get(long id) {
        Application application = load(id);
        return toDetail(application);
    }

    @Transactional
    public ApplicationDetail patch(long id, PatchRequest request) {
        Application application = loadForStaff(id);
        if (request.notes() != null) application.setNotes(blankToNull(request.notes()));
        if (request.tags() != null) application.setTags(blankToNull(request.tags()));
        if (request.source() != null) application.setSource(blankToNull(request.source()));
        if (request.referralCode() != null) application.setReferralCode(blankToNull(request.referralCode()));
        if (request.assigneeEmail() != null) {
            if (request.assigneeEmail().isBlank()) {
                application.setAssignee(null);
            } else {
                User assignee = users.findByEmailIgnoreCase(request.assigneeEmail().trim())
                        .orElseThrow(() -> new BusinessException("Assignee not found", HttpStatus.NOT_FOUND, "USER_NOT_FOUND"));
                if (assignee.getRole() == UserRole.CANDIDATE) {
                    throw new BusinessException("Assignee must be staff", HttpStatus.BAD_REQUEST, "ASSIGNEE_NOT_STAFF");
                }
                application.setAssignee(assignee);
            }
        }
        return toDetail(application);
    }

    @Transactional
    public ApplicationDetail changeStatus(long id, String status, String note) {
        Application application = loadForStaff(id);
        ApplicationStatus next = parseStatus(status);
        if (next == ApplicationStatus.WITHDRAWN) {
            throw new BusinessException("Candidates withdraw their own applications", HttpStatus.BAD_REQUEST, "APPLICATION_BAD_STATUS");
        }
        if (TERMINAL.contains(application.getStatus()) && next != ApplicationStatus.IN_REVIEW) {
            throw new BusinessException("Application is in a terminal state", HttpStatus.CONFLICT, "APPLICATION_BAD_STATUS");
        }
        if (next == ApplicationStatus.REJECTED) {
            application.setRejectReason(blankToNull(note));
        }
        record(application, next, note);
        return toDetail(application);
    }

    @Transactional
    public ApplicationDetail reject(long id, String reason) {
        return changeStatus(id, ApplicationStatus.REJECTED.name(), reason);
    }

    @Transactional
    public ApplicationDetail archive(long id) {
        Application application = loadForStaff(id);
        application.setArchivedAt(Instant.now());
        record(application, application.getStatus(), "Archived");
        return toDetail(application);
    }

    @Transactional
    public ApplicationDetail restore(long id) {
        Application application = loadForStaff(id);
        application.setArchivedAt(null);
        application.setWithdrawnAt(null);
        if (application.getStatus() == ApplicationStatus.REJECTED || application.getStatus() == ApplicationStatus.WITHDRAWN) {
            record(application, ApplicationStatus.IN_REVIEW, "Restored");
        } else {
            record(application, application.getStatus(), "Restored");
        }
        return toDetail(application);
    }

    @Transactional
    public ApplicationDetail withdraw(long id) {
        Application application = load(id);
        User actor = access.actor();
        if (!access.candidate() || !application.getCandidate().getId().equals(actor.getId())) {
            throw new BusinessException("Only the candidate can withdraw", HttpStatus.FORBIDDEN, "APPLICATION_FORBIDDEN");
        }
        if (application.getStatus() == ApplicationStatus.HIRED) {
            throw new BusinessException("Cannot withdraw a hired application", HttpStatus.CONFLICT, "APPLICATION_BAD_STATUS");
        }
        application.setWithdrawnAt(Instant.now());
        record(application, ApplicationStatus.WITHDRAWN, "Withdrawn by candidate");
        return toDetail(application);
    }

    /** After CV screening: pass → AI interview; otherwise stay in CV review. Does not auto-reject. */
    @Transactional
    public void advanceFromCvScreening(Cv cv, MatchScore score) {
        if (cv.getJob() == null || cv.getUser() == null) return;
        Application application = cv.getApplication();
        if (application == null) {
            application = applications.findByJob_IdAndCandidate_Id(cv.getJob().getId(), cv.getUser().getId()).orElse(null);
        }
        if (application == null) return;
        ApplicationStatus current = application.getStatus();
        if (current != ApplicationStatus.NEW && current != ApplicationStatus.IN_REVIEW) return;
        boolean passed = com.smarthire.tenant.cv.service.CvMatchingService.passed(score);
        if (passed) {
            record(application, ApplicationStatus.INTERVIEW, "CV passed screening; moved to AI interview");
            return;
        }
        if (current == ApplicationStatus.NEW) {
            record(application, ApplicationStatus.IN_REVIEW, "CV screening completed; not passed yet");
        }
    }

    @Transactional(readOnly = true)
    public List<HistoryView> history(long id) {
        load(id);
        return history.findByApplication_IdOrderByIdDesc(id).stream().map(mapper::history).toList();
    }

    private ApplicationDetail toDetail(Application application) {
        return mapper.detail(
                application,
                applications.countByCandidate_Id(application.getCandidate().getId()),
                cvs.findByUser_IdAndJob_IdOrderByIdDesc(application.getCandidate().getId(), application.getJob().getId()),
                history.findByApplication_IdOrderByIdDesc(application.getId()));
    }

    private void record(Application application, ApplicationStatus next, String note) {
        ApplicationStatusHistory row = new ApplicationStatusHistory();
        row.setApplication(application);
        row.setFromStatus(application.getStatus() == null ? null : application.getStatus().name());
        row.setToStatus(next.name());
        row.setChangedBy(access.actor().getId());
        row.setNote(blankToNull(note));
        application.setStatus(next);
        history.save(row);
    }

    private Application load(long id) {
        Application application = applications.findById(id)
                .orElseThrow(() -> new BusinessException("Application not found", HttpStatus.NOT_FOUND, "APPLICATION_NOT_FOUND"));
        User actor = access.actor();
        if (access.candidate()) {
            if (!application.getCandidate().getId().equals(actor.getId())) {
                throw new BusinessException("Application not found", HttpStatus.NOT_FOUND, "APPLICATION_NOT_FOUND");
            }
            return application;
        }
        access.requireJob(application.getJob());
        return application;
    }

    private Application loadForStaff(long id) {
        Application application = load(id);
        if (access.candidate()) {
            throw new BusinessException("Recruiter access required", HttpStatus.FORBIDDEN, "APPLICATION_FORBIDDEN");
        }
        return application;
    }

    private Job job(long jobId) {
        return jobs.findById(jobId)
                .orElseThrow(() -> new BusinessException("Job not found", HttpStatus.NOT_FOUND, "JOB_NOT_FOUND"));
    }

    private void attachCv(Long cvId, Job job, Application application, User actor) {
        if (cvId == null) return;
        Cv cv = cvs.findById(cvId)
                .orElseThrow(() -> new BusinessException("CV not found", HttpStatus.NOT_FOUND, "CV_NOT_FOUND"));
        if (!cv.getUser().getId().equals(actor.getId())) {
            throw new BusinessException("CV not found", HttpStatus.NOT_FOUND, "CV_NOT_FOUND");
        }
        cv.setJob(job);
        cv.setApplication(application);
        cvs.save(cv);
    }

    private static ApplicationStatus parseStatus(String status) {
        try {
            return ApplicationStatus.valueOf(status.trim().toUpperCase(Locale.ROOT));
        } catch (Exception ex) {
            throw new BusinessException("Invalid application status", HttpStatus.BAD_REQUEST, "APPLICATION_BAD_STATUS");
        }
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static String blankToValue(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }
}
