package com.smarthire.tenant.job.service;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.enums.ApplicationStatus;
import com.smarthire.domain.enums.JobStatus;
import com.smarthire.domain.enums.UserRole;
import com.smarthire.domain.tenant.entity.Application;
import com.smarthire.domain.tenant.entity.Job;
import com.smarthire.domain.tenant.entity.JobSkill;
import com.smarthire.domain.tenant.entity.RecruitmentStage;
import com.smarthire.domain.tenant.entity.Skill;
import com.smarthire.domain.tenant.repository.ApplicationRepository;
import com.smarthire.domain.tenant.repository.JobRepository;
import com.smarthire.domain.tenant.repository.JobSkillRepository;
import com.smarthire.domain.tenant.repository.RecruitmentStageRepository;
import com.smarthire.tenant.cv.dto.CvModels.JobCreateRequest;
import com.smarthire.tenant.cv.dto.CvModels.JobOption;
import com.smarthire.tenant.cv.dto.CvModels.JobSkillItem;
import com.smarthire.tenant.cv.dto.CvModels.JobSkillView;
import com.smarthire.tenant.cv.dto.CvModels.JobSkillsRequest;
import com.smarthire.tenant.cv.service.CvAccess;
import com.smarthire.tenant.cv.service.CvSkillAnalysisService;
import com.smarthire.tenant.job.dto.JobModels.ApplicationView;
import com.smarthire.tenant.job.dto.JobModels.JobDetail;
import com.smarthire.tenant.job.dto.JobModels.JobListItem;
import com.smarthire.tenant.job.dto.JobModels.JobPage;
import com.smarthire.tenant.job.dto.JobModels.JobUpsertRequest;
import com.smarthire.tenant.job.dto.JobModels.PublicJob;
import com.smarthire.tenant.job.dto.JobModels.StageItem;
import com.smarthire.tenant.job.dto.JobModels.StageView;
import com.smarthire.tenant.job.dto.JobModels.StagesRequest;
import com.smarthire.tenant.job.mapper.JobMapper;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class JobService {
    private static final Logger log = LoggerFactory.getLogger(JobService.class);
    private static final List<StageItem> DEFAULT_STAGES = List.of(
            new StageItem("Applied", 0, false),
            new StageItem("Screening", 1, false),
            new StageItem("Assessment", 2, false),
            new StageItem("Interview", 3, false),
            new StageItem("Offer", 4, false),
            new StageItem("Hired", 5, true));

    private final JobRepository jobs;
    private final JobSkillRepository jobSkills;
    private final RecruitmentStageRepository stages;
    private final ApplicationRepository applications;
    private final CvAccess access;
    private final CvSkillAnalysisService taxonomy;
    private final JobMapper mapper;
    private final JobAssignmentService assignments;

    public JobService(
            JobRepository jobs,
            JobSkillRepository jobSkills,
            RecruitmentStageRepository stages,
            ApplicationRepository applications,
            CvAccess access,
            CvSkillAnalysisService taxonomy,
            JobMapper mapper,
            JobAssignmentService assignments) {
        this.jobs = jobs;
        this.jobSkills = jobSkills;
        this.stages = stages;
        this.applications = applications;
        this.access = access;
        this.taxonomy = taxonomy;
        this.mapper = mapper;
        this.assignments = assignments;
    }

    public Map<String, String> health() {
        return Map.of("module", "job", "status", "ready");
    }

    @Transactional(readOnly = true)
    public JobPage search(String query, JobStatus status, int page, int size) {
        requireStaff();
        int safeSize = Math.min(Math.max(size, 1), 50);
        int safePage = Math.max(page, 0);
        var result = jobs.search(status, blankToNull(query), access.jobScopeUserId(), PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.DESC, "id")));
        Map<Long, Long> counts = counts(result.getContent().stream().map(Job::getId).toList());
        List<JobListItem> items = result.getContent().stream()
                .map(job -> mapper.listItem(job, counts.getOrDefault(job.getId(), 0L)))
                .toList();
        return new JobPage(items, result.getTotalElements(), safePage, safeSize);
    }

    @Transactional(readOnly = true)
    public JobDetail get(long id) {
        try {
            Job job = job(id);
            if (access.candidate()) {
                if (!mapper.accepting(job)) throw notFound();
                return mapper.detail(job, skillViews(id), stageViews(id), applications.countByJob_Id(id));
            }
            access.requireJob(job);
            return mapper.detail(job, skillViews(id), stageViews(id), applications.countByJob_Id(id));
        } catch (BusinessException ex) {
            throw ex;
        } catch (RuntimeException ex) {
            log.error("Failed to load job {}", id, ex);
            throw new BusinessException(
                    "Failed to load job: " + ex.getClass().getSimpleName() + ": " + ex.getMessage(),
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "JOB_DETAIL_FAILED");
        }
    }

    @Transactional(readOnly = true)
    public List<PublicJob> publicList(String query) {
        return jobs.publicOpen(LocalDate.now(), blankToNull(query), JobStatus.PUBLISHED).stream()
                .map(job -> mapper.publicJob(job, jobSkills.findByJob_IdOrderByIdAsc(job.getId())))
                .toList();
    }

    @Transactional(readOnly = true)
    public PublicJob publicGet(long id) {
        Job job = job(id);
        if (!mapper.accepting(job)) throw notFound();
        return mapper.publicJob(job, jobSkills.findByJob_IdOrderByIdAsc(id));
    }

    @Transactional(readOnly = true)
    public List<JobOption> published() {
        var actor = access.actor();
        Long scope = UserRole.isRecruiterStaff(actor.getRole()) ? actor.getId() : null;
        return jobs.findVisible(JobStatus.PUBLISHED, scope).stream()
                .map(mapper::option)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<JobOption> options() {
        requireStaff();
        return jobs.findVisible(null, access.jobScopeUserId()).stream().map(mapper::option).toList();
    }

    @Transactional
    public JobOption createQuick(JobCreateRequest request) {
        JobDetail created = create(new JobUpsertRequest(
                request.title(),
                request.description(),
                null, null, null, "FULL_TIME", "HYBRID", null, 1, null,
                null, null, "VND", true, null, null,
                skillsOrDefault(request.skills()), null));
        JobDetail published = publish(created.id());
        return new JobOption(published.id(), published.title(), published.status());
    }

    @Transactional
    public JobDetail create(JobUpsertRequest request) {
        requireStaff();
        Job job = new Job();
        job.setCreatedBy(access.actor());
        job.setStatus(JobStatus.DRAFT);
        apply(job, request);
        jobs.save(job);
        assignments.assignCreator(job);
        if (request.skills() != null && !request.skills().isEmpty()) {
            replaceSkillsInternal(job, request.skills());
        }
        replaceStagesInternal(job, stagesOrDefault(request.stages()));
        return get(job.getId());
    }

    @Transactional
    public JobDetail update(long id, JobUpsertRequest request) {
        Job job = managed(id);
        if (job.getStatus() == JobStatus.CLOSED || job.getStatus() == JobStatus.ARCHIVED) {
            throw new BusinessException("Closed jobs cannot be edited", HttpStatus.CONFLICT, "JOB_LOCKED");
        }
        apply(job, request);
        if (request.skills() != null) replaceSkillsInternal(job, request.skills());
        if (request.stages() != null) replaceStagesInternal(job, request.stages());
        jobs.save(job);
        return get(id);
    }

    @Transactional
    public void delete(long id) {
        Job job = managed(id);
        job.setDeletedAt(Instant.now());
        job.setStatus(JobStatus.ARCHIVED);
        jobs.save(job);
    }

    @Transactional
    public JobDetail cloneJob(long id) {
        Job source = managed(id);
        Job copy = new Job();
        copy.setCreatedBy(access.actor());
        copy.setStatus(JobStatus.DRAFT);
        copy.setTitle(source.getTitle() + " (copy)");
        copy.setDescription(source.getDescription());
        copy.setResponsibilities(source.getResponsibilities());
        copy.setBenefits(source.getBenefits());
        copy.setLocation(source.getLocation());
        copy.setEmploymentType(source.getEmploymentType());
        copy.setWorkMode(source.getWorkMode());
        copy.setDepartment(source.getDepartment());
        copy.setHeadcount(source.getHeadcount());
        copy.setDeadline(source.getDeadline());
        copy.setSalaryMin(source.getSalaryMin());
        copy.setSalaryMax(source.getSalaryMax());
        copy.setSalaryCurrency(source.getSalaryCurrency());
        copy.setSalaryVisible(source.isSalaryVisible());
        copy.setMinYearsExperience(source.getMinYearsExperience());
        copy.setEducationLevel(source.getEducationLevel());
        jobs.save(copy);
        assignments.assignCreator(copy);
        replaceSkillsInternal(copy, jobSkills.findViewRowsByJobId(id).stream()
                .map(row -> new JobSkillItem(
                        (String) row[1],
                        (String) row[2],
                        asBool(row[3]),
                        row[4] instanceof BigDecimal weight ? weight : BigDecimal.ONE,
                        (String) row[5]))
                .toList());
        replaceStagesInternal(copy, stages.findByJob_IdOrderBySortOrderAsc(id).stream()
                .map(row -> new StageItem(row.getName(), row.getSortOrder(), row.isTerminal()))
                .toList());
        return get(copy.getId());
    }

    @Transactional
    public JobDetail publish(long id) {
        Job job = managed(id);
        if (job.getStatus() == JobStatus.PUBLISHED) {
            return get(id);
        }
        if (job.getStatus() != JobStatus.DRAFT && job.getStatus() != JobStatus.PAUSED) {
            throw new BusinessException("Only draft or paused jobs can be published", HttpStatus.CONFLICT, "JOB_BAD_STATE");
        }
        if (job.getTitle() == null || job.getTitle().isBlank()
                || job.getDescription() == null || job.getDescription().isBlank()) {
            throw new BusinessException("Title and description are required to publish", HttpStatus.UNPROCESSABLE_ENTITY, "JOB_NOT_READY");
        }
        if (jobSkills.findByJob_IdOrderByIdAsc(id).isEmpty()) {
            throw new BusinessException("Add at least one skill before publishing", HttpStatus.UNPROCESSABLE_ENTITY, "JOB_SKILLS_REQUIRED");
        }
        if (stages.findByJob_IdOrderBySortOrderAsc(id).isEmpty()) {
            replaceStagesInternal(job, DEFAULT_STAGES);
        }
        job.setStatus(JobStatus.PUBLISHED);
        job.setPublishedAt(job.getPublishedAt() == null ? Instant.now() : job.getPublishedAt());
        job.setPausedAt(null);
        job.setClosedAt(null);
        jobs.save(job);
        return get(id);
    }

    @Transactional
    public JobDetail unpublish(long id) {
        Job job = managed(id);
        if (job.getStatus() != JobStatus.PUBLISHED) {
            throw new BusinessException("Only published jobs can be unpublished", HttpStatus.CONFLICT, "JOB_BAD_STATE");
        }
        job.setStatus(JobStatus.DRAFT);
        jobs.save(job);
        return get(id);
    }

    @Transactional
    public JobDetail pause(long id) {
        Job job = managed(id);
        if (job.getStatus() != JobStatus.PUBLISHED) {
            throw new BusinessException("Only published jobs can be paused", HttpStatus.CONFLICT, "JOB_BAD_STATE");
        }
        job.setStatus(JobStatus.PAUSED);
        job.setPausedAt(Instant.now());
        jobs.save(job);
        return get(id);
    }

    @Transactional
    public JobDetail close(long id) {
        Job job = managed(id);
        if (job.getStatus() != JobStatus.PUBLISHED && job.getStatus() != JobStatus.PAUSED) {
            throw new BusinessException("Only published or paused jobs can be closed", HttpStatus.CONFLICT, "JOB_BAD_STATE");
        }
        job.setStatus(JobStatus.CLOSED);
        job.setClosedAt(Instant.now());
        jobs.save(job);
        return get(id);
    }

    @Transactional
    public JobDetail reopen(long id) {
        Job job = managed(id);
        if (job.getStatus() != JobStatus.CLOSED && job.getStatus() != JobStatus.PAUSED) {
            throw new BusinessException("Only closed or paused jobs can be reopened", HttpStatus.CONFLICT, "JOB_BAD_STATE");
        }
        job.setStatus(JobStatus.PUBLISHED);
        job.setPublishedAt(job.getPublishedAt() == null ? Instant.now() : job.getPublishedAt());
        job.setPausedAt(null);
        job.setClosedAt(null);
        jobs.save(job);
        return get(id);
    }

    @Transactional(readOnly = true)
    public List<JobSkillView> skills(long jobId) {
        Job job = job(jobId);
        if (!access.candidate()) access.requireJob(job);
        return skillViews(jobId);
    }

    @Transactional
    public List<JobSkillView> replaceSkills(long jobId, JobSkillsRequest request) {
        Job job = managed(jobId);
        replaceSkillsInternal(job, request.skills());
        return skillViews(jobId);
    }

    @Transactional(readOnly = true)
    public List<StageView> listStages(long jobId) {
        Job job = job(jobId);
        if (!access.candidate()) access.requireJob(job);
        return stageViews(jobId);
    }

    @Transactional
    public List<StageView> replaceStages(long jobId, StagesRequest request) {
        Job job = managed(jobId);
        replaceStagesInternal(job, request.stages());
        return stageViews(jobId);
    }

    @Transactional
    public ApplicationView apply(long jobId, String source) {
        if (!access.candidate()) {
            throw new BusinessException("Only candidates can apply", HttpStatus.FORBIDDEN, "CV_FORBIDDEN");
        }
        Job job = job(jobId);
        if (!mapper.accepting(job)) {
            throw new BusinessException("Job is not open for applications", HttpStatus.BAD_REQUEST, "JOB_NOT_PUBLISHED");
        }
        var actor = access.actor();
        var existing = applications.findByJob_IdAndCandidate_Id(jobId, actor.getId());
        if (existing.isPresent()) return mapper.application(existing.get());
        Application application = new Application();
        application.setJob(job);
        application.setCandidate(actor);
        application.setStatus(ApplicationStatus.NEW);
        application.setSource(source == null || source.isBlank() ? "CAREER" : source);
        var first = stages.findByJob_IdOrderBySortOrderAsc(jobId).stream().findFirst().orElse(null);
        application.setStage(first);
        applications.save(application);
        return mapper.application(application);
    }

    @Transactional(readOnly = true)
    public List<ApplicationView> applications(long jobId) {
        access.requireJob(job(jobId));
        return applications.findByJob_IdOrderByIdDesc(jobId).stream().map(mapper::application).toList();
    }

    private void apply(Job job, JobUpsertRequest request) {
        job.setTitle(request.title().trim());
        job.setDescription(blankToValue(request.description(), request.title().trim()));
        job.setResponsibilities(blankToNull(request.responsibilities()));
        job.setBenefits(blankToNull(request.benefits()));
        job.setLocation(blankToNull(request.location()));
        job.setEmploymentType(blankToNull(request.employmentType()));
        job.setWorkMode(blankToNull(request.workMode()));
        job.setDepartment(blankToNull(request.department()));
        job.setHeadcount(request.headcount());
        job.setDeadline(request.deadline());
        job.setSalaryMin(request.salaryMin());
        job.setSalaryMax(request.salaryMax());
        job.setSalaryCurrency(blankToNull(request.salaryCurrency()));
        job.setSalaryVisible(request.salaryVisible() == null || request.salaryVisible());
        job.setMinYearsExperience(request.minYearsExperience());
        job.setEducationLevel(blankToNull(request.educationLevel()));
    }

    private void replaceSkillsInternal(Job job, List<JobSkillItem> items) {
        jobSkills.deleteAll(jobSkills.findByJob_IdOrderByIdAsc(job.getId()));
        jobSkills.flush();
        Map<Long, JobSkill> unique = new LinkedHashMap<>();
        for (JobSkillItem item : items) {
            if (item.name() == null || item.name().isBlank()) continue;
            Skill skill = taxonomy.resolve(item.name());
            if (item.category() != null && !item.category().isBlank() && skill.getCategory() == null) {
                skill.setCategory(item.category());
            }
            if (skill.getId() != null && unique.containsKey(skill.getId())) continue;
            JobSkill row = new JobSkill();
            row.setJob(job);
            row.setSkill(skill);
            row.setRequired(item.required());
            row.setWeight(item.weight() == null ? BigDecimal.ONE : item.weight());
            row.setMinLevel(item.minLevel());
            unique.put(skill.getId(), row);
        }
        jobSkills.saveAll(unique.values());
    }

    private void replaceStagesInternal(Job job, List<StageItem> items) {
        stages.deleteAll(stages.findByJob_IdOrderBySortOrderAsc(job.getId()));
        stages.flush();
        int order = 0;
        for (StageItem item : items) {
            RecruitmentStage stage = new RecruitmentStage();
            stage.setJob(job);
            stage.setName(item.name().trim());
            stage.setSortOrder(item.sortOrder() == 0 ? order : item.sortOrder());
            stage.setTerminal(item.terminal());
            stages.save(stage);
            order++;
        }
    }

    private List<JobSkillItem> skillsOrDefault(List<JobSkillItem> skills) {
        if (skills != null && !skills.isEmpty()) return skills;
        return List.of(
                new JobSkillItem("Java", "backend", true, new BigDecimal("30"), null),
                new JobSkillItem("Spring Boot", "backend", true, new BigDecimal("25"), null),
                new JobSkillItem("React", "frontend", true, new BigDecimal("25"), null),
                new JobSkillItem("SQL", "database", true, new BigDecimal("20"), null));
    }

    private List<StageItem> stagesOrDefault(List<StageItem> items) {
        return items == null || items.isEmpty() ? DEFAULT_STAGES : items;
    }

    private List<JobSkillView> skillViews(long jobId) {
        return jobSkills.findViewRowsByJobId(jobId).stream().map(this::skillView).toList();
    }

    private JobSkillView skillView(Object[] row) {
        return new JobSkillView(
                ((Number) row[0]).longValue(),
                (String) row[1],
                (String) row[2],
                asBool(row[3]),
                row[4] instanceof BigDecimal weight ? weight : BigDecimal.ONE,
                (String) row[5]);
    }

    private static boolean asBool(Object value) {
        if (value instanceof Boolean flag) return flag;
        return value instanceof Number number && number.intValue() != 0;
    }

    private List<StageView> stageViews(long jobId) {
        return stages.findByJob_IdOrderBySortOrderAsc(jobId).stream().map(mapper::stage).toList();
    }

    private Map<Long, Long> counts(List<Long> ids) {
        Map<Long, Long> map = new HashMap<>();
        if (ids.isEmpty()) return map;
        for (Object[] row : applications.countGroupedByJobIds(ids)) {
            map.put((Long) row[0], (Long) row[1]);
        }
        return map;
    }

    private Job managed(long id) {
        Job job = job(id);
        access.requireJob(job);
        return job;
    }

    private Job job(long id) {
        Job job = jobs.findWithOwnerById(id).orElseThrow(this::notFound);
        if (job.getDeletedAt() != null) throw notFound();
        return job;
    }

    private void requireStaff() {
        access.actor();
        if (!access.staff()) {
            throw new BusinessException("Recruiter access required", HttpStatus.FORBIDDEN, "CV_FORBIDDEN");
        }
    }

    private BusinessException notFound() {
        return new BusinessException("Job not found", HttpStatus.NOT_FOUND, "JOB_NOT_FOUND");
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static String blankToValue(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }
}
