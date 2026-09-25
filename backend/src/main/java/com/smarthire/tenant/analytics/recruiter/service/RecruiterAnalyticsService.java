package com.smarthire.tenant.analytics.recruiter.service;

import static com.smarthire.tenant.analytics.recruiter.dto.RecruiterAnalyticsModels.*;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.tenant.entity.User;
import com.smarthire.domain.tenant.repository.RecruiterAnalyticsRepository;
import com.smarthire.tenant.analytics.recruiter.mapper.RecruiterAnalyticsMapper;
import com.smarthire.tenant.cv.service.CvAccess;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class RecruiterAnalyticsService {
    private static final Map<String, String> STAGE_LABELS = Map.of(
            "NEW", "Ứng tuyển", "IN_REVIEW", "Sàng lọc", "ASSESSMENT", "Assessment",
            "INTERVIEW", "Phỏng vấn", "OFFER", "Offer", "HIRED", "Đã tuyển");
    private static final List<String> PIPELINE_ORDER = List.of("NEW", "IN_REVIEW", "ASSESSMENT", "INTERVIEW", "OFFER", "HIRED");
    private final RecruiterAnalyticsRepository repository;
    private final RecruiterAnalyticsMapper mapper;
    private final CvAccess access;

    public RecruiterAnalyticsService(RecruiterAnalyticsRepository repository, RecruiterAnalyticsMapper mapper, CvAccess access) {
        this.repository = repository; this.mapper = mapper; this.access = access;
    }

    public WorkloadResponse workload(Filter filter) {
        long userId = recruiter().getId();
        ActionCounts actions = new ActionCounts(
                repository.countCvsToScreen(userId, filter.from(), filter.to()),
                repository.countOverdue(userId, filter.from(), filter.to()),
                repository.countPendingReviews(userId, filter.from(), filter.to()),
                repository.countUpcomingInterviews(userId, filter.from(), filter.to()));
        Map<Long, JobAttention> jobs = new LinkedHashMap<>();
        for (Object[] row : repository.findJobAttention(userId, filter.from(), filter.to())) {
            long id = mapper.number(row[0]), candidates = mapper.number(row[2]), overdue = mapper.number(row[4]);
            JobAttention current = jobs.get(id);
            long total = candidates + (current == null ? 0 : current.candidateCount());
            long totalOverdue = overdue + (current == null ? 0 : current.overdueCount());
            jobs.put(id, new JobAttention(id, mapper.text(row[1]), total,
                    current == null ? mapper.text(row[3]) : current.currentFocusStage(), totalOverdue, health(totalOverdue)));
        }
        return new WorkloadResponse(actions, jobs.values().stream().limit(8).toList());
    }

    public PipelineResponse pipeline(Filter filter) {
        long userId = recruiter().getId();
        Map<String, Long> counts = new LinkedHashMap<>();
        for (Object[] row : repository.findPipeline(userId, filter.from(), filter.to())) counts.put(mapper.text(row[0]), mapper.number(row[1]));
        long total = counts.values().stream().mapToLong(Long::longValue).sum(), previous = total;
        List<PipelineStage> stages = new ArrayList<>();
        for (String code : PIPELINE_ORDER) {
            long value = counts.getOrDefault(code, 0L);
            stages.add(new PipelineStage(code, STAGE_LABELS.get(code), value, previous == 0 ? null : mapper.percent(value, previous)));
            if (value > 0) previous = value;
        }
        List<SlaAlert> alerts = repository.findSlaAlerts(userId, filter.from(), filter.to()).stream().map(row -> {
            String code = mapper.text(row[0]);
            return new SlaAlert(code, STAGE_LABELS.getOrDefault(code, code), mapper.number(row[1]), mapper.number(row[2]), mapper.number(row[3]));
        }).toList();
        return new PipelineResponse(total, repository.countActiveJobs(userId, filter.from(), filter.to()), stages, alerts);
    }

    public QualityResponse quality(Filter filter) {
        long userId = recruiter().getId();
        List<SourceQuality> sources = repository.findSourceQuality(userId, filter.from(), filter.to()).stream().map(row -> {
            long volume = mapper.number(row[1]); String code = mapper.text(row[0]);
            return new SourceQuality(code, mapper.sourceLabel(code), volume, mapper.decimal(row[2]), mapper.percent(mapper.number(row[3]), volume));
        }).toList();
        List<TrendPoint> trend = repository.findQualityTrend(userId, filter.from(), filter.to()).stream()
                .map(row -> new TrendPoint(mapper.text(row[0]), mapper.decimal(row[1]))).toList();
        SourceQuality best = sources.stream().filter(s -> s.averageQualityScore() != null)
                .max((a, b) -> a.averageQualityScore().compareTo(b.averageQualityScore())).orElse(null);
        Insight insight = best == null ? null : new Insight("Nguồn ứng viên nổi bật", best.label() + " có điểm chất lượng trung bình cao nhất trong kỳ.");
        return new QualityResponse(mapper.decimal(repository.averageQuality(userId, filter.from(), filter.to())), sources, trend, insight);
    }

    public PerformanceResponse performance(Filter filter) {
        long userId = recruiter().getId();
        BigDecimal hours = mapper.decimal(repository.averageShortlistHours(userId, filter.from(), filter.to()));
        BigDecimal shortlistDays = hours == null ? null : hours.divide(BigDecimal.valueOf(24), 1, RoundingMode.HALF_UP);
        BigDecimal responseHours = mapper.decimal(repository.averageResponseHours(userId, filter.from(), filter.to()));
        long accepted = repository.countAcceptedOffers(userId, filter.from(), filter.to());
        long decided = repository.countDecidedOffers(userId, filter.from(), filter.to());
        long hired = repository.countHired(userId, filter.from(), filter.to());
        long applications = repository.countApplications(userId, filter.from(), filter.to());
        List<PerformanceMetric> metrics = List.of(
                metric("TIME_TO_SHORTLIST", shortlistDays, "DAYS", "3", "LTE"),
                metric("RESPONSE_TIME", responseHours, "HOURS", "24", "LTE"),
                metric("OFFER_ACCEPTANCE", decided == 0 ? null : mapper.percent(accepted, decided), "PERCENT", "75", "GTE"),
                metric("HIRE_RATE", applications == 0 ? null : mapper.percent(hired, applications), "PERCENT", "14.8", "GTE"));
        long achieved = metrics.stream().filter(m -> Boolean.TRUE.equals(m.achieved())).count();
        return new PerformanceResponse(metrics, achieved, metrics.size(), achieved == metrics.size()
                ? "Bạn đang đạt toàn bộ mục tiêu có dữ liệu." : "Ưu tiên các chỉ số chưa đạt và các bước đang quá SLA.");
    }

    private User recruiter() {
        if (access.candidate()) throw new BusinessException("Recruiter analytics is not available to candidates", HttpStatus.FORBIDDEN, "ANALYTICS_FORBIDDEN");
        return access.actor();
    }
    private static int health(long overdue) { return (int) Math.max(0, 100 - Math.min(60, overdue * 10)); }
    private static PerformanceMetric metric(String code, BigDecimal value, String unit, String targetValue, String comparison) {
        BigDecimal target = new BigDecimal(targetValue);
        Boolean achieved = value == null ? null : "LTE".equals(comparison) ? value.compareTo(target) <= 0 : value.compareTo(target) >= 0;
        return new PerformanceMetric(code, value, unit, target, comparison, achieved);
    }
}
