package com.smarthire.tenant.dashboard.service;

import com.smarthire.tenant.dashboard.dto.DashboardSummaryResponse;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Map;
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
              (SELECT AVG(overall) FROM overall_scores)
            """;

    private final EntityManager entityManager;

    public DashboardService(EntityManager entityManager) {
        this.entityManager = entityManager;
    }

    public DashboardSummaryResponse summary() {
        Object[] row = (Object[]) entityManager.createNativeQuery(SUMMARY_QUERY).getSingleResult();
        long totalApplications = number(row[4]);
        BigDecimal hireRate = totalApplications == 0
                ? null
                : BigDecimal.valueOf(number(row[3]) * 100)
                        .divide(BigDecimal.valueOf(totalApplications), 1, RoundingMode.HALF_UP);

        return new DashboardSummaryResponse(
                number(row[0]),
                number(row[1]),
                number(row[2]),
                hireRate,
                decimal(row[5]));
    }

    public Map<String, String> health() {
        return Map.of("module", "dashboard", "status", "scaffold");
    }

    private static long number(Object value) {
        return value == null ? 0 : ((Number) value).longValue();
    }

    private static BigDecimal decimal(Object value) {
        if (value == null) return null;
        return value instanceof BigDecimal decimal ? decimal : new BigDecimal(value.toString());
    }
}

