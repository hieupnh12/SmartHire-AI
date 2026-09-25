package com.smarthire.tenant.dashboard.service;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.enums.UserRole;
import com.smarthire.tenant.dashboard.dto.DashboardSummaryResponse;
import com.smarthire.tenant.dashboard.dto.DashboardActionItemsResponse;
import com.smarthire.tenant.dashboard.dto.DashboardChartsResponse;
import com.smarthire.tenant.dashboard.dto.DashboardChartsResponse.Metric;
import com.smarthire.tenant.dashboard.dto.DashboardChartsResponse.ScoreBucket;
import com.smarthire.tenant.dashboard.dto.DashboardTrendPoint;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class DashboardService {

    private static final String SUMMARY_QUERY = """
            SELECT
              (SELECT COUNT(*) FROM jobs WHERE status = 'PUBLISHED' AND deleted_at IS NULL),
              (SELECT COUNT(*) FROM applications WHERE status = 'NEW'),
              (SELECT COUNT(*) FROM interview_schedules
                WHERE status IN ('PROPOSED', 'CONFIRMED') AND scheduled_start >= CURRENT_TIMESTAMP),
              (SELECT COUNT(*) FROM applications WHERE status = 'HIRED'),
              (SELECT COUNT(*) FROM applications),
              (SELECT AVG(overall) FROM overall_scores),
              (SELECT COUNT(*) FROM jobs WHERE deleted_at IS NULL),
              (SELECT COUNT(*) FROM jobs WHERE status = 'PAUSED' AND deleted_at IS NULL),
              (SELECT COUNT(*) FROM jobs WHERE status = 'DRAFT' AND deleted_at IS NULL),
              (SELECT COUNT(*) FROM jobs WHERE status = 'PUBLISHED' AND deleted_at IS NULL
                AND deadline BETWEEN CURRENT_TIMESTAMP AND DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 7 DAY)),
              (SELECT COUNT(DISTINCT a.id) FROM applications a JOIN cvs c ON c.application_id = a.id
                WHERE c.status IN ('UPLOADED', 'PARSED') AND a.status IN ('NEW', 'IN_REVIEW')),
              (SELECT COUNT(*) FROM applications a JOIN jobs j ON j.id = a.job_id
                WHERE j.status = 'PUBLISHED' AND j.deleted_at IS NULL)
            """;

    private static final String FUNNEL_QUERY = """
            SELECT status, COUNT(*) FROM applications
            WHERE created_at >= :fromDate AND created_at < :toDate GROUP BY status
            """;
    private static final String SOURCE_QUERY = """
            SELECT COALESCE(NULLIF(source, ''), 'UNKNOWN'), COUNT(*) FROM applications
            WHERE created_at >= :fromDate AND created_at < :toDate GROUP BY COALESCE(NULLIF(source, ''), 'UNKNOWN')
            ORDER BY COUNT(*) DESC
            """;
    private static final String SCORE_QUERY = """
            SELECT FLOOR(LEAST(overall, 99.99) / 20) * 20, COUNT(*) FROM overall_scores
            WHERE updated_at >= :fromDate AND updated_at < :toDate
            GROUP BY FLOOR(LEAST(overall, 99.99) / 20) ORDER BY 1
            """;
    private static final String TREND_QUERY = """
            SELECT CASE
                     WHEN :granularity = 'MONTH' THEN DATE_FORMAT(a.created_at, '%Y-%m')
                     WHEN :granularity = 'WEEK' THEN DATE_FORMAT(DATE_SUB(DATE(a.created_at), INTERVAL WEEKDAY(a.created_at) DAY), '%Y-%m-%d')
                     ELSE DATE_FORMAT(a.created_at, '%Y-%m-%d')
                   END period,
                   COUNT(*),
                   SUM(CASE WHEN a.status = 'HIRED' THEN 1 ELSE 0 END),
                   AVG(os.overall)
            FROM applications a
            LEFT JOIN overall_scores os ON os.application_id = a.id
            WHERE a.created_at >= :fromDate AND a.created_at < :toDate
            GROUP BY period ORDER BY period
            """;

    private final EntityManager entityManager;

    public DashboardService(EntityManager entityManager) {
        this.entityManager = entityManager;
    }

    public Map<String, String> health() {
        return Map.of("module", "dashboard", "status", "scaffold");
    }

    public DashboardSummaryResponse summary() {
        String role = currentRole();
        if (role == null || UserRole.isCandidate(role)) {
            throw new BusinessException("Access denied", HttpStatus.FORBIDDEN, "FORBIDDEN");
        }
        Object[] row = (Object[]) entityManager.createNativeQuery(SUMMARY_QUERY).getSingleResult();
        long totalApplications = number(row[4]);
        BigDecimal hireRate = totalApplications == 0
                ? null
                : BigDecimal.valueOf(number(row[3]) * 100)
                        .divide(BigDecimal.valueOf(totalApplications), 1, RoundingMode.HALF_UP);

        BigDecimal averageApplications = number(row[0]) == 0 ? BigDecimal.ZERO
                : BigDecimal.valueOf(number(row[11])).divide(BigDecimal.valueOf(number(row[0])), 1, RoundingMode.HALF_UP);
        return new DashboardSummaryResponse(
                number(row[0]),
                number(row[1]),
                number(row[2]),
                hireRate,
                decimal(row[5]),
                number(row[6]),
                number(row[0]),
                number(row[7]),
                number(row[8]),
                number(row[9]),
                totalApplications,
                averageApplications,
                number(row[10]));
    }

    public DashboardActionItemsResponse actionItems() {
        DashboardSummaryResponse summary = summary();
        return new DashboardActionItemsResponse(summary.newApplicants(), summary.pendingCvScreening(),
                summary.interviewsScheduled(), summary.draftJobs(), summary.jobsNearDeadline());
    }

    public DashboardChartsResponse charts(LocalDate from, LocalDate to) {
        DateRange range = range(from, to);
        List<Metric> funnel = rows(FUNNEL_QUERY, range).stream()
                .map(row -> new Metric(String.valueOf(row[0]), number(row[1]))).toList();
        List<Metric> sources = rows(SOURCE_QUERY, range).stream()
                .map(row -> new Metric(String.valueOf(row[0]), number(row[1]))).toList();
        List<ScoreBucket> scores = new ArrayList<>();
        for (Object[] row : rows(SCORE_QUERY, range)) {
            BigDecimal min = decimal(row[0]);
            BigDecimal max = min.add(BigDecimal.valueOf(20));
            scores.add(new ScoreBucket(min.intValue() + "–" + max.intValue(), number(row[1]), min, max));
        }
        return new DashboardChartsResponse(funnel, sources, scores);
    }

    public List<DashboardTrendPoint> trends(LocalDate from, LocalDate to, String granularity) {
        DateRange range = range(from, to);
        String normalized = granularity == null ? "DAY" : granularity.toUpperCase(Locale.ROOT);
        if (!List.of("DAY", "WEEK", "MONTH").contains(normalized)) normalized = "DAY";
        var query = entityManager.createNativeQuery(TREND_QUERY)
                .setParameter("fromDate", range.from())
                .setParameter("toDate", range.to())
                .setParameter("granularity", normalized);
        @SuppressWarnings("unchecked")
        List<Object[]> rows = query.getResultList();
        return rows.stream().map(row -> new DashboardTrendPoint(
                String.valueOf(row[0]), number(row[1]), number(row[2]), decimal(row[3]))).toList();
    }

    private static long number(Object value) {
        return value == null ? 0 : ((Number) value).longValue();
    }

    private static BigDecimal decimal(Object value) {
        if (value == null) return null;
        return value instanceof BigDecimal decimal ? decimal : new BigDecimal(value.toString());
    }
    private List<Object[]> rows(String sql, DateRange range) {
        var query = entityManager.createNativeQuery(sql)
                .setParameter("fromDate", range.from())
                .setParameter("toDate", range.to());
        @SuppressWarnings("unchecked")
        List<Object[]> result = query.getResultList();
        return result;
    }

    private static DateRange range(LocalDate from, LocalDate to) {
        LocalDate safeTo = to == null ? LocalDate.now(ZoneOffset.UTC) : to;
        LocalDate safeFrom = from == null ? safeTo.minusDays(29) : from;
        if (safeFrom.isAfter(safeTo) || safeFrom.isBefore(safeTo.minusYears(1))) safeFrom = safeTo.minusDays(29);
        return new DateRange(safeFrom.atStartOfDay().toInstant(ZoneOffset.UTC),
                safeTo.plusDays(1).atStartOfDay().toInstant(ZoneOffset.UTC));
    }

    private record DateRange(java.time.Instant from, java.time.Instant to) {}

    private static String currentRole() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }
        for (GrantedAuthority authority : authentication.getAuthorities()) {
            String value = authority.getAuthority();
            if (value != null && value.startsWith("ROLE_")) {
                return value.substring("ROLE_".length());
            }
        }
        return null;
    }
}
