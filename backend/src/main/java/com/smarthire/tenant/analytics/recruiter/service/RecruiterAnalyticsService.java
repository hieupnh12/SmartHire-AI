package com.smarthire.tenant.analytics.recruiter.service;

import static com.smarthire.tenant.analytics.recruiter.dto.RecruiterAnalyticsModels.*;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.enums.ApplicationStatus;
import com.smarthire.domain.tenant.entity.Job;
import com.smarthire.domain.tenant.entity.JobSkill;
import com.smarthire.domain.tenant.entity.User;
import com.smarthire.domain.tenant.repository.JobRepository;
import com.smarthire.domain.tenant.repository.JobSkillRepository;
import com.smarthire.domain.tenant.repository.RecruiterAnalyticsRepository;
import com.smarthire.tenant.analytics.recruiter.mapper.RecruiterAnalyticsMapper;
import com.smarthire.tenant.cv.service.CvAccess;
import com.smarthire.tenant.matching.service.SkillScoringService;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class RecruiterAnalyticsService {
    private static final Map<String, String> STAGE_LABELS = Map.ofEntries(
            Map.entry("NEW", "Ứng tuyển"),
            Map.entry("IN_REVIEW", "Sàng lọc"),
            Map.entry("ASSESSMENT", "Assessment"),
            Map.entry("INTERVIEW", "Phỏng vấn AI"),
            Map.entry("HUMAN_INTERVIEW", "Phỏng vấn chuyên môn"),
            Map.entry("OFFER", "Offer"),
            Map.entry("HIRED", "Đã tuyển"));
    private static final List<String> PIPELINE_ORDER = List.of(
            "NEW", "IN_REVIEW", "ASSESSMENT", "INTERVIEW", "HUMAN_INTERVIEW", "OFFER", "HIRED");
    private static final List<String> DROP_OFF_STAGES = List.of(
            "NEW", "IN_REVIEW", "ASSESSMENT", "INTERVIEW", "HUMAN_INTERVIEW", "OFFER");
    private static final Set<String> NON_TERMINAL_STAGES = Set.copyOf(DROP_OFF_STAGES);
    private static final Set<String> AI_COMPLETED_STATUSES = Set.of("SCORED", "PASSED", "FAILED");

    private final RecruiterAnalyticsRepository repository;
    private final RecruiterAnalyticsMapper mapper;
    private final CvAccess access;
    private final JobRepository jobs;
    private final JobSkillRepository jobSkills;
    private final SkillScoringService skillScoring;
    private final ObjectMapper objectMapper;

    @Autowired
    public RecruiterAnalyticsService(
            RecruiterAnalyticsRepository repository,
            RecruiterAnalyticsMapper mapper,
            CvAccess access,
            JobRepository jobs,
            JobSkillRepository jobSkills,
            SkillScoringService skillScoring,
            ObjectMapper objectMapper) {
        this.repository = repository;
        this.mapper = mapper;
        this.access = access;
        this.jobs = jobs;
        this.jobSkills = jobSkills;
        this.skillScoring = skillScoring;
        this.objectMapper = objectMapper;
    }

    public JobOverviewResponse jobOverview(Filter filter) {
        Job job = requireAuthorizedJob(filter.jobId());
        long userId = access.actor().getId();
        long jobId = job.getId();

        long hiredAllTime = repository.countJobHiredAllTime(jobId);
        long pendingOffers = repository.countJobPendingOffersAllTime(jobId);
        long allTimeApps = repository.countJobAllTimeApplications(jobId);
        long appsInRange = repository.countApplications(userId, jobId, filter.from(), filter.to());
        long hiredInRange = repository.countHired(userId, jobId, filter.from(), filter.to());
        BigDecimal conversion = appsInRange == 0
                ? BigDecimal.ZERO.setScale(1, RoundingMode.HALF_UP)
                : mapper.percent(hiredInRange, appsInRange);
        BigDecimal avgScore = mapper.decimal(repository.averageQuality(userId, jobId, filter.from(), filter.to()));

        return new JobOverviewResponse(
                jobId,
                job.getTitle(),
                job.getStatus().name(),
                job.getDepartment(),
                job.getScreeningMode().name(),
                job.getHeadcount(),
                hiredAllTime,
                pendingOffers,
                appsInRange,
                allTimeApps,
                conversion,
                avgScore,
                repository.countOverdue(userId, jobId, filter.from(), filter.to()),
                repository.countCvsToScreen(userId, jobId, filter.from(), filter.to()),
                repository.countPendingReviews(userId, jobId, filter.from(), filter.to()),
                repository.countUpcomingInterviews(userId, jobId, filter.from(), filter.to()),
                job.getPublishedAt(),
                job.getDeadline());
    }

    public WorkloadResponse workload(Filter filter) {
        resolveJobScope(filter.jobId());
        long userId = access.actor().getId();
        Long jobId = filter.jobId();
        ActionCounts actions = new ActionCounts(
                repository.countCvsToScreen(userId, jobId, filter.from(), filter.to()),
                repository.countOverdue(userId, jobId, filter.from(), filter.to()),
                repository.countPendingReviews(userId, jobId, filter.from(), filter.to()),
                repository.countUpcomingInterviews(userId, jobId, filter.from(), filter.to()));
        Map<Long, JobAttention> attentionMap = new LinkedHashMap<>();
        for (Object[] row : repository.findJobAttention(userId, jobId, filter.from(), filter.to())) {
            long id = mapper.number(row[0]);
            long candidates = mapper.number(row[2]);
            long overdue = mapper.number(row[4]);
            JobAttention current = attentionMap.get(id);
            long total = candidates + (current == null ? 0 : current.candidateCount());
            long totalOverdue = overdue + (current == null ? 0 : current.overdueCount());
            attentionMap.put(id, new JobAttention(
                    id,
                    mapper.text(row[1]),
                    total,
                    current == null ? mapper.text(row[3]) : current.currentFocusStage(),
                    totalOverdue,
                    health(totalOverdue)));
        }
        return new WorkloadResponse(actions, attentionMap.values().stream().limit(8).toList());
    }

    public PipelineResponse pipeline(Filter filter) {
        resolveJobScope(filter.jobId());
        long userId = access.actor().getId();
        Long jobId = filter.jobId();

        Map<String, Long> currentCounts = new LinkedHashMap<>();
        for (Object[] row : repository.findPipeline(userId, jobId, filter.from(), filter.to())) {
            currentCounts.put(mapper.text(row[0]), mapper.number(row[1]));
        }
        long totalCandidates = currentCounts.values().stream().mapToLong(Long::longValue).sum();

        Map<String, Long> reachedCounts = new LinkedHashMap<>();
        for (Object[] row : repository.findReachedStages(userId, jobId, filter.from(), filter.to())) {
            reachedCounts.put(mapper.text(row[0]), mapper.number(row[1]));
        }
        reachedCounts.merge("NEW", totalCandidates, Math::max);

        Map<String, BigDecimal> avgHoursByStage = computeAverageHoursByStage(
                repository.findStageTransitions(userId, jobId, filter.from(), filter.to()),
                Instant.now());

        long previous = 0;
        List<PipelineStage> stages = new ArrayList<>();
        for (String code : PIPELINE_ORDER) {
            long current = currentCounts.getOrDefault(code, 0L);
            long reached = Math.max(current, reachedCounts.getOrDefault(code, 0L));
            BigDecimal conversion = null;
            if (!"NEW".equals(code) && previous > 0) {
                BigDecimal raw = mapper.percent(reached, previous);
                conversion = raw.compareTo(BigDecimal.valueOf(100)) > 0 ? BigDecimal.valueOf(100.0).setScale(1) : raw;
            }
            if (reached > 0) {
                previous = reached;
            }
            stages.add(new PipelineStage(
                    code,
                    STAGE_LABELS.get(code),
                    current,
                    reached,
                    conversion,
                    avgHoursByStage.get(code)));
        }

        List<SlaAlert> alerts = repository.findSlaAlerts(userId, jobId, filter.from(), filter.to()).stream()
                .map(row -> {
                    String code = mapper.text(row[0]);
                    return new SlaAlert(
                            code,
                            STAGE_LABELS.getOrDefault(code, code),
                            mapper.number(row[1]),
                            mapper.number(row[2]),
                            mapper.number(row[3]));
                })
                .toList();

        Map<String, StageDropOff> dropMap = new LinkedHashMap<>();
        for (String code : DROP_OFF_STAGES) {
            dropMap.put(code, new StageDropOff(code, STAGE_LABELS.get(code), 0, 0, 0, 0));
        }
        for (Object[] row : repository.findStageDropOffs(userId, jobId, filter.from(), filter.to())) {
            String code = mapper.text(row[0]);
            long rejected = mapper.number(row[1]);
            long failed = mapper.number(row[2]);
            long withdrawn = mapper.number(row[3]);
            long sum = rejected + failed + withdrawn;
            dropMap.put(code, new StageDropOff(code, STAGE_LABELS.getOrDefault(code, code), rejected, failed, withdrawn, sum));
        }

        return new PipelineResponse(
                totalCandidates,
                repository.countActiveJobs(userId, jobId, filter.from(), filter.to()),
                stages,
                alerts,
                List.copyOf(dropMap.values()));
    }

    public QualityResponse quality(Filter filter) {
        resolveJobScope(filter.jobId());
        long userId = access.actor().getId();
        Long jobId = filter.jobId();

        List<SourceQuality> sources = repository.findSourceQuality(userId, jobId, filter.from(), filter.to()).stream()
                .map(row -> {
                    long volume = mapper.number(row[1]);
                    String code = mapper.text(row[0]);
                    return new SourceQuality(
                            code,
                            mapper.sourceLabel(code),
                            volume,
                            mapper.decimal(row[2]),
                            mapper.percent(mapper.number(row[3]), volume));
                })
                .toList();

        List<TrendPoint> trend = buildTrend(userId, jobId, filter.from(), filter.to());

        SourceQuality best = sources.stream()
                .filter(s -> s.averageQualityScore() != null)
                .max(Comparator.comparing(SourceQuality::averageQualityScore))
                .orElse(null);
        Insight insight = best == null
                ? null
                : new Insight("Nguồn ứng viên nổi bật", best.label() + " có điểm chất lượng trung bình cao nhất trong kỳ.");

        List<ScoreDistribution> distributions = List.of(
                buildScoreDistribution("OVERALL", repository.findOverallScoreRows(userId, jobId, filter.from(), filter.to())),
                buildScoreDistribution("CV_MATCH", repository.findCvMatchScoreRows(userId, jobId, filter.from(), filter.to())),
                buildScoreDistribution("ASSESSMENT", repository.findAssessmentScoreRows(userId, jobId, filter.from(), filter.to())),
                buildScoreDistribution("AI_INTERVIEW", repository.findAiInterviewScoreRows(userId, jobId, filter.from(), filter.to())));

        return new QualityResponse(
                mapper.decimal(repository.averageQuality(userId, jobId, filter.from(), filter.to())),
                sources,
                trend,
                insight,
                distributions);
    }

    public PerformanceResponse performance(Filter filter) {
        resolveJobScope(filter.jobId());
        long userId = access.actor().getId();
        Long jobId = filter.jobId();

        BigDecimal hours = mapper.decimal(repository.averageShortlistHours(userId, jobId, filter.from(), filter.to()));
        BigDecimal shortlistDays = hours == null ? null : hours.divide(BigDecimal.valueOf(24), 1, RoundingMode.HALF_UP);
        BigDecimal responseHours = mapper.decimal(repository.averageResponseHours(userId, jobId, filter.from(), filter.to()));
        long accepted = repository.countAcceptedOffers(userId, jobId, filter.from(), filter.to());
        long decided = repository.countDecidedOffers(userId, jobId, filter.from(), filter.to());
        long hired = repository.countHired(userId, jobId, filter.from(), filter.to());
        long applications = repository.countApplications(userId, jobId, filter.from(), filter.to());

        List<PerformanceMetric> metrics = List.of(
                metric("TIME_TO_SHORTLIST", shortlistDays, "DAYS", "3", "LTE"),
                metric("RESPONSE_TIME", responseHours, "HOURS", "24", "LTE"),
                metric("OFFER_ACCEPTANCE", decided == 0 ? null : mapper.percent(accepted, decided), "PERCENT", "75", "GTE"),
                metric("HIRE_RATE", applications == 0 ? null : mapper.percent(hired, applications), "PERCENT", "14.8", "GTE"));
        long achieved = metrics.stream().filter(m -> Boolean.TRUE.equals(m.achieved())).count();
        return new PerformanceResponse(
                metrics,
                achieved,
                metrics.size(),
                achieved == metrics.size()
                        ? "Bạn đang đạt toàn bộ mục tiêu có dữ liệu."
                        : "Ưu tiên các chỉ số chưa đạt và các bước đang quá SLA.");
    }

    public JobInsightsResponse jobInsights(Filter filter) {
        Job job = requireAuthorizedJob(filter.jobId());
        long jobId = job.getId();

        SkillGapComputation skillGapData = computeSkillGaps(jobId, filter.from(), filter.to());
        LossAnalysis lossAnalysis = computeLossAnalysis(jobId, filter.from(), filter.to());
        ProctorSummary proctorSummary = computeProctorSummary(jobId, filter.from(), filter.to());
        HumanInterviewSummary humanInterviews = computeHumanInterviewSummary(jobId, filter.from(), filter.to());
        AiInterviewSummary aiInterviews = computeAiInterviewSummary(job, filter.from(), filter.to());

        return new JobInsightsResponse(
                jobId,
                skillGapData.evaluatedCvCount(),
                skillGapData.items(),
                lossAnalysis,
                proctorSummary,
                humanInterviews,
                aiInterviews);
    }

    private Job requireAuthorizedJob(Long jobId) {
        if (jobId == null) {
            throw new BusinessException("jobId is required", HttpStatus.BAD_REQUEST, "JOB_ID_REQUIRED");
        }
        return resolveJobScope(jobId);
    }

    private Job resolveJobScope(Long jobId) {
        recruiter();
        if (jobId == null) return null;
        Job job = jobs.findWithOwnerById(jobId)
                .orElseThrow(() -> new BusinessException("Job not found", HttpStatus.NOT_FOUND, "JOB_NOT_FOUND"));
        access.requireJob(job);
        return job;
    }

    private User recruiter() {
        if (access.candidate()) {
            throw new BusinessException("Recruiter analytics is not available to candidates", HttpStatus.FORBIDDEN, "ANALYTICS_FORBIDDEN");
        }
        return access.actor();
    }

    private List<TrendPoint> buildTrend(long userId, Long jobId, Instant from, Instant to) {
        long days = Math.max(1, Duration.between(from, to).toDays());
        String granularity = days <= 45 ? "DAY" : days <= 150 ? "WEEK" : "MONTH";

        Map<String, TrendAccumulator> byPeriod = new TreeMap<>();
        for (Object[] row : repository.findApplicationTrend(userId, jobId, from, to, granularity)) {
            String period = mapper.text(row[0]);
            if (period == null) continue;
            byPeriod.put(period, new TrendAccumulator(
                    mapper.number(row[1]),
                    mapper.number(row[2]),
                    mapper.decimal(row[3])));
        }
        for (Object[] row : repository.findQualitySnapshotTrend(userId, jobId, from, to, granularity)) {
            String period = mapper.text(row[0]);
            if (period == null) continue;
            BigDecimal snapScore = mapper.decimal(row[1]);
            byPeriod.compute(period, (k, existing) -> existing == null
                    ? new TrendAccumulator(0, 0, snapScore)
                    : new TrendAccumulator(existing.applications(), existing.hired(),
                            snapScore != null ? snapScore : existing.score()));
        }
        return byPeriod.entrySet().stream()
                .map(entry -> new TrendPoint(
                        entry.getKey(),
                        entry.getValue().score(),
                        entry.getValue().applications(),
                        entry.getValue().hired()))
                .toList();
    }

    private ScoreDistribution buildScoreDistribution(String type, List<Object[]> rows) {
        int[][] ranges = {{0, 19}, {20, 39}, {40, 59}, {60, 79}, {80, 100}};
        String[] labels = {"0–19", "20–39", "40–59", "60–79", "80–100"};
        long[] bucketCounts = new long[ranges.length];

        long count = 0;
        double sum = 0;
        Double min = null;
        Double max = null;
        long passCount = 0;
        long passChecked = 0;

        for (Object[] row : rows) {
            if (row[0] == null) continue;
            double value = ((Number) row[0]).doubleValue();
            double clamped = Math.max(0.0, Math.min(100.0, value));
            count++;
            sum += clamped;
            min = min == null ? clamped : Math.min(min, clamped);
            max = max == null ? clamped : Math.max(max, clamped);

            int idx = clamped >= 80 ? 4 : (int) (clamped / 20);
            bucketCounts[Math.max(0, Math.min(4, idx))]++;

            if (row.length > 1 && row[1] != null) {
                passChecked++;
                if (((Number) row[1]).intValue() == 1) {
                    passCount++;
                }
            }
        }

        List<ScoreBucket> buckets = new ArrayList<>(ranges.length);
        for (int i = 0; i < ranges.length; i++) {
            buckets.add(new ScoreBucket(labels[i], bucketCounts[i], ranges[i][0], ranges[i][1]));
        }

        return new ScoreDistribution(
                type,
                count,
                count == 0 ? null : BigDecimal.valueOf(sum / count).setScale(1, RoundingMode.HALF_UP),
                min == null ? null : BigDecimal.valueOf(min).setScale(1, RoundingMode.HALF_UP),
                max == null ? null : BigDecimal.valueOf(max).setScale(1, RoundingMode.HALF_UP),
                passChecked == 0 ? null : mapper.percent(passCount, passChecked),
                buckets);
    }

    Map<String, BigDecimal> computeAverageHoursByStage(List<Object[]> transitions, Instant now) {
        Map<String, List<Double>> durationsByStage = new HashMap<>();
        Long currentAppId = null;
        String currentAppStatus = null;
        String currentStage = null;
        Instant enteredAt = null;

        for (Object[] row : transitions) {
            long appId = mapper.number(row[0]);
            String appStatus = mapper.text(row[1]);
            Instant appCreatedAt = mapper.instant(row[2]);
            String fromStatus = mapper.text(row[3]);
            String toStatus = mapper.text(row[4]);
            Instant histAt = mapper.instant(row[5]);

            if (currentAppId == null || appId != currentAppId) {
                flushOngoingStage(durationsByStage, currentStage, currentAppStatus, enteredAt, now);
                currentAppId = appId;
                currentAppStatus = appStatus;
                currentStage = ApplicationStatus.NEW.name();
                enteredAt = appCreatedAt;
            }

            if (histAt != null && toStatus != null) {
                String exitedStage = fromStatus != null ? fromStatus : currentStage;
                if (exitedStage != null && NON_TERMINAL_STAGES.contains(exitedStage) && enteredAt != null && !histAt.isBefore(enteredAt)) {
                    double hours = Duration.between(enteredAt, histAt).toMinutes() / 60.0;
                    durationsByStage.computeIfAbsent(exitedStage, k -> new ArrayList<>()).add(hours);
                }
                currentStage = toStatus;
                enteredAt = histAt;
            }
        }
        flushOngoingStage(durationsByStage, currentStage, currentAppStatus, enteredAt, now);

        Map<String, BigDecimal> averages = new LinkedHashMap<>();
        for (String stage : PIPELINE_ORDER) {
            List<Double> list = durationsByStage.get(stage);
            if (list != null && !list.isEmpty()) {
                double avg = list.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
                averages.put(stage, BigDecimal.valueOf(avg).setScale(1, RoundingMode.HALF_UP));
            }
        }
        return averages;
    }

    private static void flushOngoingStage(
            Map<String, List<Double>> durationsByStage,
            String currentStage,
            String currentAppStatus,
            Instant enteredAt,
            Instant now) {
        if (currentStage != null
                && NON_TERMINAL_STAGES.contains(currentStage)
                && currentStage.equals(currentAppStatus)
                && enteredAt != null
                && !now.isBefore(enteredAt)) {
            double hours = Duration.between(enteredAt, now).toMinutes() / 60.0;
            durationsByStage.computeIfAbsent(currentStage, k -> new ArrayList<>()).add(hours);
        }
    }

    private SkillGapComputation computeSkillGaps(long jobId, Instant from, Instant to) {
        List<JobSkill> requirements = jobSkills.findByJob_IdOrderByIdAsc(jobId);
        Map<Long, Set<String>> candidateSkillsByApp = new LinkedHashMap<>();

        for (Object[] row : repository.findJobCvSkills(jobId, from, to)) {
            long appId = mapper.number(row[0]);
            String normalized = skillScoring.normalize(mapper.text(row[1]));
            if (!normalized.isEmpty()) {
                candidateSkillsByApp.computeIfAbsent(appId, k -> new LinkedHashSet<>()).add(normalized);
            }
        }
        for (Object[] row : repository.findJobCvAnalysisSkills(jobId, from, to)) {
            long appId = mapper.number(row[0]);
            if (candidateSkillsByApp.containsKey(appId)) continue;
            Set<String> parsed = extractSkillsFromJson(mapper.text(row[1]));
            if (!parsed.isEmpty()) {
                candidateSkillsByApp.put(appId, parsed);
            }
        }

        long totalEvaluated = candidateSkillsByApp.size();
        List<SkillGapItem> items = new ArrayList<>();
        for (JobSkill req : requirements) {
            String rawName = req.getSkill().getName();
            String normalizedReq = skillScoring.normalize(rawName);
            long matched = 0;
            for (Set<String> candSkills : candidateSkillsByApp.values()) {
                boolean hasMatch = candSkills.stream()
                        .anyMatch(c -> skillScoring.similarity(normalizedReq, c).compareTo(BigDecimal.ZERO) > 0);
                if (hasMatch) matched++;
            }
            BigDecimal coverage = totalEvaluated == 0
                    ? BigDecimal.ZERO.setScale(1, RoundingMode.HALF_UP)
                    : mapper.percent(matched, totalEvaluated);
            BigDecimal gap = BigDecimal.valueOf(100).setScale(1, RoundingMode.HALF_UP).subtract(coverage);
            items.add(new SkillGapItem(
                    rawName,
                    skillScoring.category(req.getSkill()),
                    req.isRequired(),
                    req.getWeight(),
                    req.getMinLevel(),
                    matched,
                    totalEvaluated,
                    coverage,
                    gap));
        }

        items.sort(Comparator.comparing(SkillGapItem::required).reversed()
                .thenComparing(SkillGapItem::coveragePercent));
        return new SkillGapComputation(totalEvaluated, items);
    }

    private Set<String> extractSkillsFromJson(String json) {
        if (json == null || json.isBlank()) return Set.of();
        try {
            JsonNode node = objectMapper.readTree(json);
            if (!node.isArray()) return Set.of();
            Set<String> result = new LinkedHashSet<>();
            for (JsonNode item : node) {
                String name = item.isTextual() ? item.asText() : item.path("name").asText("");
                String normalized = skillScoring.normalize(name);
                if (!normalized.isEmpty()) result.add(normalized);
            }
            return result;
        } catch (Exception ignored) {
            return Set.of();
        }
    }

    private LossAnalysis computeLossAnalysis(long jobId, Instant from, Instant to) {
        long rejected = 0;
        long failed = 0;
        long withdrawn = 0;
        List<String> rawRejectReasons = new ArrayList<>();
        List<String> rawWithdrawReasons = new ArrayList<>();

        for (Object[] row : repository.findJobLossStatusesAndReasons(jobId, from, to)) {
            String status = mapper.text(row[0]);
            String rejectReason = mapper.text(row[1]);
            String withdrawReason = mapper.text(row[2]);
            if ("REJECTED".equals(status)) {
                rejected++;
                if (rejectReason != null && !rejectReason.isBlank()) rawRejectReasons.add(rejectReason);
            } else if ("FAILED".equals(status)) {
                failed++;
                if (rejectReason != null && !rejectReason.isBlank()) rawRejectReasons.add(rejectReason);
            } else if ("WITHDRAWN".equals(status)) {
                withdrawn++;
                if (withdrawReason != null && !withdrawReason.isBlank()) rawWithdrawReasons.add(withdrawReason);
            }
        }

        return new LossAnalysis(
                rejected,
                failed,
                withdrawn,
                topReasons(rawRejectReasons, rejected + failed),
                topReasons(rawWithdrawReasons, withdrawn));
    }

    private List<ReasonStat> topReasons(List<String> reasons, long denominator) {
        Map<String, String> displayByKey = new HashMap<>();
        Map<String, Long> countsByKey = new HashMap<>();
        for (String raw : reasons) {
            String trimmed = raw.trim().replaceAll("\\s+", " ");
            String key = trimmed.toLowerCase(Locale.ROOT);
            displayByKey.putIfAbsent(key, trimmed);
            countsByKey.merge(key, 1L, Long::sum);
        }
        long totalDenom = denominator > 0 ? denominator : reasons.size();
        return countsByKey.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .limit(6)
                .map(entry -> new ReasonStat(
                        displayByKey.get(entry.getKey()),
                        entry.getValue(),
                        mapper.percent(entry.getValue(), totalDenom)))
                .toList();
    }

    private ProctorSummary computeProctorSummary(long jobId, Instant from, Instant to) {
        long totalSubmissions = repository.countFinishedSubmissionsForJob(jobId, from, to);
        List<Object> riskRows = repository.findProctorReportRiskScores(jobId, from, to);
        long low = 0;
        long medium = 0;
        long high = 0;
        double riskSum = 0;
        for (Object row : riskRows) {
            if (row == null) continue;
            double score = ((Number) row).doubleValue();
            riskSum += score;
            if (score >= 60.0) high++;
            else if (score >= 30.0) medium++;
            else low++;
        }
        long reportsCount = low + medium + high;
        BigDecimal avgRisk = reportsCount == 0
                ? null
                : BigDecimal.valueOf(riskSum / reportsCount).setScale(1, RoundingMode.HALF_UP);
        List<ProctorEventStat> topEvents = repository.findProctorEventCounts(jobId, from, to).stream()
                .limit(6)
                .map(row -> new ProctorEventStat(mapper.text(row[0]), mapper.number(row[1])))
                .toList();
        return new ProctorSummary(totalSubmissions, reportsCount, low, medium, high, avgRisk, topEvents);
    }

    private HumanInterviewSummary computeHumanInterviewSummary(long jobId, Instant from, Instant to) {
        List<Object[]> rows = repository.findHumanInterviewEvaluations(jobId, from, to);
        long count = rows.size();
        double techSum = 0; long techCount = 0;
        double commSum = 0; long commCount = 0;
        double cultSum = 0; long cultCount = 0;
        double overallSum = 0; long overallCount = 0;
        Map<String, Long> recommendations = new LinkedHashMap<>();

        for (Object[] row : rows) {
            if (row[0] != null) { techSum += ((Number) row[0]).doubleValue(); techCount++; }
            if (row[1] != null) { commSum += ((Number) row[1]).doubleValue(); commCount++; }
            if (row[2] != null) { cultSum += ((Number) row[2]).doubleValue(); cultCount++; }
            if (row[3] != null) { overallSum += ((Number) row[3]).doubleValue(); overallCount++; }
            String rec = mapper.text(row[4]);
            if (rec != null && !rec.isBlank()) {
                recommendations.merge(rec, 1L, Long::sum);
            }
        }

        return new HumanInterviewSummary(
                count,
                avg(techSum, techCount),
                avg(commSum, commCount),
                avg(cultSum, cultCount),
                avg(overallSum, overallCount),
                recommendations);
    }

    private AiInterviewSummary computeAiInterviewSummary(Job job, Instant from, Instant to) {
        List<Object[]> rows = repository.findAiInterviewStats(job.getId(), from, to);
        long total = rows.size();
        long completed = 0;
        long passed = 0;
        double scoreSum = 0;
        long scoredCount = 0;

        for (Object[] row : rows) {
            String status = mapper.text(row[0]);
            if (status != null && AI_COMPLETED_STATUSES.contains(status)) {
                completed++;
            }
            if (row[1] != null) {
                double score = ((Number) row[1]).doubleValue();
                scoreSum += score;
                scoredCount++;
                BigDecimal threshold = row[2] != null
                        ? BigDecimal.valueOf(((Number) row[2]).doubleValue())
                        : job.getAiInterviewPassingScore();
                if (threshold != null && score >= threshold.doubleValue()) {
                    passed++;
                }
            }
        }
        return new AiInterviewSummary(
                total,
                completed,
                passed,
                avg(scoreSum, scoredCount),
                job.getAiInterviewPassingScore());
    }

    private static BigDecimal avg(double sum, long count) {
        return count == 0 ? null : BigDecimal.valueOf(sum / count).setScale(1, RoundingMode.HALF_UP);
    }

    private static int health(long overdue) {
        return (int) Math.max(0, 100 - Math.min(60, overdue * 10));
    }

    private static PerformanceMetric metric(String code, BigDecimal value, String unit, String targetValue, String comparison) {
        BigDecimal target = new BigDecimal(targetValue);
        Boolean achieved = value == null
                ? null
                : "LTE".equals(comparison) ? value.compareTo(target) <= 0 : value.compareTo(target) >= 0;
        return new PerformanceMetric(code, value, unit, target, comparison, achieved);
    }

    private record TrendAccumulator(long applications, long hired, BigDecimal score) {}
    private record SkillGapComputation(long evaluatedCvCount, List<SkillGapItem> items) {}
}
