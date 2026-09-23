package com.smarthire.tenant.matching.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.enums.*;
import com.smarthire.domain.tenant.entity.*;
import com.smarthire.domain.tenant.repository.RankingDataRepository;
import com.smarthire.multitenancy.context.TenantContext;
import com.smarthire.tenant.cv.service.CvAccess;
import com.smarthire.tenant.matching.dto.RankingModels.*;
import com.smarthire.tenant.matching.realtime.RankingWebSocketHandler;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class RankingService {
    private final RankingDataRepository data;
    private final RankingCalculator calculator;
    private final SkillScoringService skills;
    private final ExperienceScoringService experience;
    private final ObjectMapper mapper;
    private final RankingWebSocketHandler realtime;
    private final CvAccess access;
    @org.springframework.beans.factory.annotation.Autowired
    public RankingService(RankingDataRepository data, RankingCalculator calculator, SkillScoringService skills,
                          ExperienceScoringService experience, ObjectMapper mapper,
                          org.springframework.beans.factory.ObjectProvider<RankingWebSocketHandler> realtime,
                          org.springframework.beans.factory.ObjectProvider<CvAccess> access) {
        this.data = data; this.calculator = calculator; this.skills = skills; this.experience = experience; this.mapper = mapper;
        this.realtime = realtime.getIfAvailable();
        this.access = access.getIfAvailable();
    }
    public RankingService(RankingDataRepository data, RankingCalculator calculator, SkillScoringService skills,
                          ExperienceScoringService experience, ObjectMapper mapper) {
        this.data = data; this.calculator = calculator; this.skills = skills; this.experience = experience; this.mapper = mapper; this.realtime = null; this.access = null;
    }
    private static final Set<String> STAFF = Set.of(
            "ROLE_STAFF", "ROLE_RECRUITER", "ROLE_HR", "ROLE_ADMIN", "ROLE_TENANT_ADMIN");

    private String actor() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        String tenant = TenantContext.getCurrentTenant();
        if (tenant == null || tenant.isBlank() || tenant.equals("smarthire_master") || auth == null
                || !auth.isAuthenticated() || !tenant.equals(auth.getDetails())
                || auth.getAuthorities().stream().map(a -> a.getAuthority()).noneMatch(STAFF::contains))
            throw new BusinessException("Recruiter tenant access required", HttpStatus.FORBIDDEN, "RANKING_FORBIDDEN");
        return auth.getName();
    }
    private Job authorize(long jobId, boolean lock) {
        actor();
        Job job = data.job(jobId, lock);
        if (job == null || job.getDeletedAt() != null)
            throw new BusinessException("Job not found", HttpStatus.NOT_FOUND, "JOB_NOT_FOUND");
        if (access != null) {
            access.requireJob(job);
            return job;
        }
        if (!job.getCreatedBy().getEmail().equalsIgnoreCase(actor()))
            throw new BusinessException("Job not found", HttpStatus.NOT_FOUND, "JOB_NOT_FOUND");
        return job;
    }
    private Application application(long id) {
        actor();
        Application app = data.application(id);
        if (app == null) throw new BusinessException("Application not found", HttpStatus.NOT_FOUND, "APPLICATION_NOT_FOUND");
        authorize(app.getJob().getId(), false);
        return app;
    }
    @Transactional(readOnly = true)
    public List<JobOption> jobs() {
        String email = actor();
        if (access != null && UserRole.isCompanyAdmin(access.actor().getRole())) {
            return data.activeJobs().stream().map(j -> new JobOption(j.getId(), j.getTitle())).toList();
        }
        if (access != null) {
            return data.assignedJobs(access.actor().getId()).stream().map(j -> new JobOption(j.getId(), j.getTitle())).toList();
        }
        return data.jobs(email).stream().map(j -> new JobOption(j.getId(), j.getTitle())).toList();
    }
    private Config configuration(long jobId, List<JobSkill> requirements) {
        RankingConfig stored = data.config(jobId);
        if (stored != null) return decode(stored.getConfigJson(), Config.class);
        List<String> categories = requirements.stream().map(r -> skills.category(r.getSkill())).distinct().sorted().toList();
        if (categories.isEmpty()) categories = List.of("other");
        Map<String, Integer> groups = new TreeMap<>();
        for (int i = 0; i < categories.size(); i++) groups.put(categories.get(i), 100 / categories.size() + (i < 100 % categories.size() ? 1 : 0));
        // Unsaved defaults require the recruiter to supply the job's experience requirement.
        return new Config(new Weights(35, 15, 30, 20), groups, 0, 0);
    }
    public Board configure(long jobId, Config request) {
        Job job = authorize(jobId, true);
        calculator.validate(request);
        Set<String> categories = data.requirements(jobId).stream().map(r -> skills.category(r.getSkill())).collect(Collectors.toSet());
        if ((request.weights().skills() > 0 || request.weights().experience() > 0) && categories.isEmpty())
            throw new IllegalArgumentException("Add job skill requirements before enabling skill scoring");
        if (!categories.isEmpty() && !request.groups().keySet().equals(categories))
            throw new IllegalArgumentException("Groups must match the job skill categories; refresh the board");
        RankingConfig stored = data.config(jobId);
        long revision = stored == null ? 0 : stored.getRevision();
        if (request.revision() != revision)
            throw new BusinessException("Configuration changed; refresh before saving", HttpStatus.CONFLICT, "RANKING_CONFLICT");
        Config config = new Config(request.weights(), request.groups(), request.requiredExperienceMonths(), revision + 1);
        RankingConfig entity = stored == null ? new RankingConfig() : stored;
        entity.setJobId(jobId); entity.setRevision(revision + 1); entity.setConfigJson(encode(config)); data.save(entity);
        return notifyUpdated(compute(job, true));
    }
    @Transactional(readOnly = true)
    public Board board(long jobId) { return compute(authorize(jobId, false), false); }
    @Transactional(readOnly = true)
    public BoardPage page(long jobId, int page, int size, String search, String status, String cohort,
                          BigDecimal minScore, String sort) {
        if (page < 0 || !Set.of(20, 50, 100).contains(size))
            throw new IllegalArgumentException("Page must be non-negative and size must be 20, 50 or 100");
        if (!Set.of("score", "skills", "experience", "assessment", "interview").contains(sort))
            throw new IllegalArgumentException("Unsupported ranking sort");
        Board board = compute(authorize(jobId, false), false);
        List<Row> all = board.rows();
        Set<String> terminal = Set.of("REJECTED", "WITHDRAWN", "HIRED");
        String term = search == null ? "" : search.trim().toLowerCase(Locale.ROOT);
        List<Row> filtered = all.stream()
                .filter(row -> term.isEmpty() || row.candidateName().toLowerCase(Locale.ROOT).contains(term))
                .filter(row -> "ALL".equals(status) || ("ACTIVE".equals(status) ? !terminal.contains(row.status()) : row.status().equals(status)))
                .filter(row -> "ALL".equals(cohort) || ("COMPLETE".equals(cohort) ? row.result().complete() : row.result().cohort().equals(cohort)))
                .filter(row -> minScore == null || row.result().score() != null && row.result().score().compareTo(minScore) >= 0)
                .sorted(Comparator.comparing((Row row) -> sortScore(row, sort), Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(Row::applicationId))
                .toList();
        int from = Math.min(page * size, filtered.size());
        int to = Math.min(from + size, filtered.size());
        List<Row> items = filtered.subList(from, to).stream().map(this::lightweight).toList();
        List<Row> scored = all.stream().filter(row -> row.result().score() != null).toList();
        Row top = scored.stream().max(Comparator.comparing(row -> row.result().score())).orElse(null);
        BigDecimal average = scored.isEmpty() ? null : scored.stream().map(row -> row.result().score())
                .reduce(BigDecimal.ZERO, BigDecimal::add).divide(BigDecimal.valueOf(scored.size()), 2, java.math.RoundingMode.HALF_UP);
        Summary summary = new Summary(all.size(), all.stream().filter(row -> !terminal.contains(row.status())).count(), scored.size(),
                average, top == null ? null : top.candidateName(), top == null ? null : top.result().score(),
                all.stream().filter(row -> row.result().complete()).count());
        return new BoardPage(board.jobId(), board.jobTitle(), board.config(), board.rankingVersion(), board.calculatedAt(),
                items, board.skillCategories(), all.stream().map(row -> row.result().cohort()).filter(value -> !value.isBlank()).distinct().sorted().toList(), summary,
                new PageInfo(page, size, filtered.size(), filtered.isEmpty() ? 0 : (filtered.size() + size - 1) / size));
    }

    private BigDecimal sortScore(Row row, String key) {
        if ("score".equals(key)) return row.result().score();
        return row.result().components().stream().filter(component -> component.key().equals(key))
                .map(Component::score).findFirst().orElse(null);
    }

    private Row lightweight(Row row) {
        return new Row(row.applicationId(), row.candidateName(), row.status(), row.rank(), row.result(), List.of(), List.of(),
                row.experienceMonths(), List.of(), row.notices(), row.sources(), null, List.of(), null);
    }
    public Board recompute(long jobId) { return notifyUpdated(compute(authorize(jobId, true), true)); }
    public Board recomputeFromWorker(long jobId) {
        Job job = data.job(jobId, true);
        if (job == null || job.getDeletedAt() != null)
            throw new BusinessException("Job not found", HttpStatus.NOT_FOUND, "JOB_NOT_FOUND");
        return notifyUpdated(compute(job, true));
    }
    @Transactional(readOnly = true)
    public Row overall(long appId) {
        Application app = application(appId);
        return compute(app.getJob(), false).rows().stream().filter(r -> r.applicationId() == appId).findFirst().orElseThrow();
    }
    @Transactional(readOnly = true)
    public Sources sources(long appId) {
        application(appId);
        return new Sources(data.cvs(appId).stream().map(c -> new SourceOption(c.getId(), c.getOriginalFilename(), c.getStatus().name())).toList(),
                data.attempts(appId).stream().map(a -> new SourceOption(a.getId(), "Assessment #" + a.getId(), a.getStatus().name())).toList(),
                data.interviews(appId).stream().map(i -> new SourceOption(i.getId(), "Interview #" + i.getId(), i.getStatus().name())).toList(), selection(appId));
    }
    public Board select(long appId, Selection selected) {
        Application app = application(appId);
        Job job = authorize(app.getJob().getId(), true);
        choose(data.cvs(appId), selected.cvId(), Cv::getId);
        choose(data.attempts(appId), selected.attemptId(), Attempt::getId);
        choose(data.interviews(appId), selected.interviewId(), Interview::getId);
        RankingSource source = new RankingSource();
        source.setApplicationId(appId); source.setCvId(selected.cvId()); source.setAttemptId(selected.attemptId()); source.setInterviewId(selected.interviewId());
        data.save(source);
        return notifyUpdated(compute(job, true));
    }
    private Board notifyUpdated(Board board) {
        if (realtime != null) {
            String tenant = TenantContext.getCurrentTenant();
            org.springframework.transaction.support.TransactionSynchronizationManager.registerSynchronization(
                    new org.springframework.transaction.support.TransactionSynchronization() {
                        @Override public void afterCommit() { realtime.rankingUpdated(tenant, board.jobId(), board.rankingVersion()); }
                    });
        }
        return board;
    }
    private Selection selection(long appId) {
        RankingSource selected = data.source(appId);
        return selected == null ? new Selection(null, null, null) : new Selection(selected.getCvId(), selected.getAttemptId(), selected.getInterviewId());
    }
    private <T> T choose(List<T> options, Long selected, Function<T, Long> id) {
        if (selected != null) return options.stream().filter(o -> id.apply(o).equals(selected)).findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Selected source does not belong to this application"));
        return options.size() == 1 ? options.getFirst() : null;
    }
    private Board compute(Job job, boolean persist) {
        List<JobSkill> requirements = data.requirements(job.getId());
        Config config = configuration(job.getId(), requirements);
        List<Application> applications = data.applications(job.getId());
        List<Row> rows = calculator.rank(applications.stream().map(a -> row(a, config, requirements)).toList());
        String version = RankingCalculator.VERSION + ":" + config.revision();
        if (persist) {
            data.replaceSnapshots(job.getId());
            Map<Long, Application> byId = applications.stream().collect(Collectors.toMap(Application::getId, Function.identity()));
            for (Row row : rows) {
                if (row.result().score() == null) continue;
                OverallScore overall = new OverallScore();
                overall.setApplication(byId.get(row.applicationId())); overall.setOverall(row.result().score());
                overall.setBreakdownJson(encode(row)); overall.setRankingVersion(version); data.save(overall);
                if (row.rank() != null) {
                    CandidateRanking rank = new CandidateRanking(); rank.setJob(job); rank.setApplication(byId.get(row.applicationId()));
                    rank.setRankPosition(row.rank()); rank.setScore(row.result().score()); rank.setRankingVersion(version); data.save(rank);
                }
            }
        }
        return new Board(job.getId(), job.getTitle(), config, version, Instant.now(), rows,
                requirements.stream().map(r -> skills.category(r.getSkill())).distinct().sorted().toList());
    }
    private Row row(Application app, Config config, List<JobSkill> requirements) {
        long id = app.getId();
        Selection selected = selection(id);
        List<Cv> cvs = data.cvs(id); List<Attempt> attempts = data.attempts(id); List<Interview> interviews = data.interviews(id);
        Cv cv = choose(cvs, selected.cvId(), Cv::getId);
        Attempt attempt = choose(attempts, selected.attemptId(), Attempt::getId);
        Interview interview = choose(interviews, selected.interviewId(), Interview::getId);
        Map<String, BigDecimal> scores = new HashMap<>(); Map<String, String> states = new HashMap<>();
        List<String> notices = new ArrayList<>(); List<GroupScore> groups = List.of();
        ExperienceScoringService.Result exp = new ExperienceScoringService.Result(null, null, List.of(), "MISSING");
        if (config.revision() == 0) notices.add("CONFIGURATION_REQUIRED");
        boolean configurationCurrent = config.groups().keySet().equals(requirements.stream().map(r -> skills.category(r.getSkill())).collect(Collectors.toSet()));
        if (!configurationCurrent) notices.add("JOB_SKILLS_CHANGED");
        if (cv != null && cv.getStatus() == CvStatus.ANALYZED) {
            groups = skills.score(requirements, data.skills(cv.getId()), config.groups());
            if (configurationCurrent && !requirements.isEmpty()) scores.put("skills", skills.overall(groups));
            exp = experience.score(data.extraction(cv.getId()), requirements.stream().map(r -> skills.normalize(r.getSkill().getName())).collect(Collectors.toSet()),
                    config.requiredExperienceMonths(), YearMonth.now(ZoneOffset.UTC));
            scores.put("experience", exp.score()); states.put("experience", exp.state());
        } else {
            String state = cv == null ? (cvs.size() > 1 ? "SELECT_SOURCE" : "MISSING") : cv.getStatus() == CvStatus.FAILED ? "FAILED" : "PROCESSING";
            states.put("skills", state); states.put("experience", state);
        }
        states.putIfAbsent("skills", "NEEDS_REVIEW");
        if (config.requiredExperienceMonths() == 0 && config.weights().experience() > 0) states.put("experience", "NEEDS_REVIEW");
        AttemptScore assessment = attempt != null && attempt.getStatus() == AttemptStatus.GRADED ? data.assessment(attempt.getId()) : null;
        InterviewScore interviewScore = interview != null && interview.getStatus() == InterviewStatus.SCORED ? data.interview(interview.getId()) : null;
        addScore(scores, states, "assessment", assessment == null ? null : assessment.getTotalScore(),
                attempt == null ? (attempts.size() > 1 ? "SELECT_SOURCE" : "MISSING") : "PROCESSING");
        addScore(scores, states, "interview", interviewScore == null ? null : interviewScore.getOverallScore(),
                interview == null ? (interviews.size() > 1 ? "SELECT_SOURCE" : "MISSING") : interview.getStatus() == InterviewStatus.FAILED ? "FAILED" : "PROCESSING");
        List<String> missing = groups.stream().flatMap(g -> g.matches().stream()).filter(m -> m.required() && m.similarity().compareTo(BigDecimal.ONE) < 0)
                .map(SkillMatch::requiredSkill).toList();
        List<TimelineEvent> timeline = new ArrayList<>();
        timeline.add(new TimelineEvent("APPLICATION_RECEIVED", app.getCreatedAt()));
        data.history(id).forEach(item -> timeline.add(new TimelineEvent("STATUS_" + item.getToStatus(), item.getCreatedAt())));
        if (cv != null && cv.getStatus() == CvStatus.ANALYZED) timeline.add(new TimelineEvent("CV_ANALYZED", cv.getUpdatedAt()));
        if (assessment != null) timeline.add(new TimelineEvent("ASSESSMENT_GRADED", assessment.getGradedAt()));
        if (interviewScore != null) timeline.add(new TimelineEvent("INTERVIEW_SCORED", interviewScore.getCreatedAt()));
        timeline.sort(Comparator.comparing(TimelineEvent::occurredAt, Comparator.nullsLast(Comparator.naturalOrder())));
        if (config.revision() == 0) scores.clear();
        return new Row(id, app.getCandidate().getFullName(), app.getStatus().name(), null,
                calculator.calculate(config.weights(), scores, states), groups, missing, exp.months(), exp.evidence(), notices,
                new Selection(cv == null ? null : cv.getId(), attempt == null ? null : attempt.getId(), interview == null ? null : interview.getId()),
                interviewScore == null ? null : interviewScore.getFeedback(), timeline,
                insight(calculator.calculate(config.weights(), scores, states), missing));
    }
    private Insight insight(Calculation result, List<String> missing) {
        BigDecimal score = result.score();
        String recommendation = score == null ? "WAIT_FOR_DATA" : score.compareTo(BigDecimal.valueOf(80)) >= 0
                ? "ADVANCE" : score.compareTo(BigDecimal.valueOf(60)) >= 0 ? "REVIEW" : "HOLD";
        List<String> strengths = result.components().stream().filter(component -> component.score() != null && component.score().compareTo(BigDecimal.valueOf(75)) >= 0)
                .map(component -> "STRONG_" + component.key().toUpperCase(Locale.ROOT)).toList();
        List<String> risks = new ArrayList<>();
        if (!missing.isEmpty()) risks.add("MISSING_REQUIRED_SKILLS");
        result.components().stream().filter(component -> component.score() == null).map(component -> "MISSING_" + component.key().toUpperCase(Locale.ROOT)).forEach(risks::add);
        List<String> questions = missing.stream().limit(3).map(skill -> "VERIFY_SKILL:" + skill).toList();
        return new Insight(recommendation, strengths, risks, questions);
    }
    private void addScore(Map<String, BigDecimal> scores, Map<String, String> states, String key, BigDecimal value, String absent) {
        if (value != null && (value.signum() < 0 || value.compareTo(BigDecimal.valueOf(100)) > 0)) states.put(key, "NEEDS_REVIEW");
        else { scores.put(key, value); states.put(key, absent); }
    }
    private String encode(Object value) {
        try { return mapper.writeValueAsString(value); }
        catch (JsonProcessingException e) { throw new IllegalStateException("Cannot serialize ranking data", e); }
    }
    private <T> T decode(String value, Class<T> type) {
        try { return mapper.readValue(value, type); }
        catch (JsonProcessingException e) { throw new IllegalStateException("Invalid stored ranking configuration", e); }
    }
}
