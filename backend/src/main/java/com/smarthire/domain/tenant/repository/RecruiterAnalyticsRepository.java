package com.smarthire.domain.tenant.repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import java.time.Instant;
import java.util.List;
import org.springframework.stereotype.Repository;

@Repository
public class RecruiterAnalyticsRepository {
    private static final String SCOPE = """
            (a.assignee_id = :userId OR (a.assignee_id IS NULL AND
              (j.created_by = :userId OR EXISTS (SELECT 1 FROM job_recruiter_assignments jra
                WHERE jra.job_id = j.id AND jra.recruiter_id = :userId AND jra.unassigned_at IS NULL))))
            """;
    private static final String SLA = """
            COALESCE((SELECT MIN(p.threshold_minutes) FROM recruitment_sla_policies p
              WHERE p.active = TRUE AND p.application_status = a.status
                AND (p.job_id IS NULL OR p.job_id = j.id)
                AND (p.stage_id IS NULL OR p.stage_id = a.stage_id)), 1440)
            """;
    private final EntityManager entityManager;

    public RecruiterAnalyticsRepository(EntityManager entityManager) {
        this.entityManager = entityManager;
    }

    public long countCvsToScreen(long userId, Instant from, Instant to) { return count("""
            SELECT COUNT(*) FROM cvs c JOIN applications a ON a.id=c.application_id JOIN jobs j ON j.id=a.job_id
            WHERE %s AND c.status IN ('UPLOADED','PARSED') AND a.status IN ('NEW','IN_REVIEW')
              AND c.created_at BETWEEN :fromDate AND :toDate
            """.formatted(SCOPE), userId, from, to); }
    public long countOverdue(long userId, Instant from, Instant to) { return count("""
            SELECT COUNT(*) FROM applications a JOIN jobs j ON j.id=a.job_id
            WHERE %s AND a.status NOT IN ('HIRED','REJECTED','WITHDRAWN')
              AND TIMESTAMPDIFF(MINUTE,a.updated_at,CURRENT_TIMESTAMP) > %s
            """.formatted(SCOPE, SLA), userId, from, to); }
    public long countPendingReviews(long userId, Instant from, Instant to) { return count("""
            SELECT COUNT(*) FROM attempts t JOIN applications a ON a.id=t.application_id JOIN jobs j ON j.id=a.job_id
            WHERE %s AND t.review_status='PENDING' AND t.created_at BETWEEN :fromDate AND :toDate
            """.formatted(SCOPE), userId, from, to); }
    public long countUpcomingInterviews(long userId, Instant from, Instant to) { return count("""
            SELECT COUNT(*) FROM interview_schedules s JOIN applications a ON a.id=s.application_id JOIN jobs j ON j.id=a.job_id
            WHERE %s AND s.status IN ('PROPOSED','CONFIRMED')
              AND s.starts_at BETWEEN CURRENT_TIMESTAMP AND DATE_ADD(CURRENT_TIMESTAMP,INTERVAL 48 HOUR)
            """.formatted(SCOPE), userId, from, to); }
    public List<Object[]> findJobAttention(long userId, Instant from, Instant to) { return rows("""
            SELECT j.id,j.title,COUNT(a.id),COALESCE(MAX(rs.name),a.status),
              SUM(CASE WHEN a.status NOT IN ('HIRED','REJECTED','WITHDRAWN')
                AND TIMESTAMPDIFF(MINUTE,a.updated_at,CURRENT_TIMESTAMP) > %s THEN 1 ELSE 0 END)
            FROM applications a JOIN jobs j ON j.id=a.job_id LEFT JOIN recruitment_stages rs ON rs.id=a.stage_id
            WHERE %s AND a.created_at BETWEEN :fromDate AND :toDate
            GROUP BY j.id,j.title,a.status ORDER BY 5 DESC,3 DESC
            """.formatted(SLA, SCOPE), userId, from, to); }
    public List<Object[]> findPipeline(long userId, Instant from, Instant to) { return rows("""
            SELECT a.status,COUNT(*) FROM applications a JOIN jobs j ON j.id=a.job_id
            WHERE %s AND a.created_at BETWEEN :fromDate AND :toDate GROUP BY a.status
            """.formatted(SCOPE), userId, from, to); }
    public long countActiveJobs(long userId, Instant from, Instant to) { return count("""
            SELECT COUNT(DISTINCT j.id) FROM applications a JOIN jobs j ON j.id=a.job_id
            WHERE %s AND j.status='PUBLISHED' AND a.created_at BETWEEN :fromDate AND :toDate
            """.formatted(SCOPE), userId, from, to); }
    public List<Object[]> findSlaAlerts(long userId, Instant from, Instant to) { return rows("""
            SELECT a.status,COUNT(*),TIMESTAMPDIFF(MINUTE,MIN(a.updated_at),CURRENT_TIMESTAMP),%s AS threshold_minutes
            FROM applications a JOIN jobs j ON j.id=a.job_id
            WHERE %s AND a.status NOT IN ('HIRED','REJECTED','WITHDRAWN')
              AND TIMESTAMPDIFF(MINUTE,a.updated_at,CURRENT_TIMESTAMP) > %s
            GROUP BY a.status,threshold_minutes ORDER BY 2 DESC
            """.formatted(SLA, SCOPE, SLA), userId, from, to); }
    public List<Object[]> findSourceQuality(long userId, Instant from, Instant to) { return rows("""
            SELECT COALESCE(NULLIF(UPPER(TRIM(a.source)),''),'OTHER'),COUNT(*),AVG(os.overall),
              SUM(CASE WHEN a.status='HIRED' THEN 1 ELSE 0 END)
            FROM applications a JOIN jobs j ON j.id=a.job_id LEFT JOIN overall_scores os ON os.application_id=a.id
            WHERE %s AND a.created_at BETWEEN :fromDate AND :toDate
            GROUP BY COALESCE(NULLIF(UPPER(TRIM(a.source)),''),'OTHER') ORDER BY 2 DESC
            """.formatted(SCOPE), userId, from, to); }
    public List<Object[]> findQualityTrend(long userId, Instant from, Instant to) { return rows("""
            SELECT DATE_FORMAT(cqs.calculated_at,'%%Y-%%m'),AVG(cqs.score) FROM candidate_quality_snapshots cqs
            JOIN applications a ON a.id=cqs.application_id JOIN jobs j ON j.id=a.job_id
            WHERE %s AND cqs.calculated_at BETWEEN :fromDate AND :toDate
            GROUP BY DATE_FORMAT(cqs.calculated_at,'%%Y-%%m') ORDER BY 1
            """.formatted(SCOPE), userId, from, to); }
    public Object averageQuality(long userId, Instant from, Instant to) { return scalar("""
            SELECT AVG(os.overall) FROM applications a JOIN jobs j ON j.id=a.job_id
            JOIN overall_scores os ON os.application_id=a.id
            WHERE %s AND a.created_at BETWEEN :fromDate AND :toDate
            """.formatted(SCOPE), userId, from, to); }
    public Object averageShortlistHours(long userId, Instant from, Instant to) { return scalar("""
            SELECT AVG(TIMESTAMPDIFF(HOUR,a.created_at,h.first_at)) FROM applications a JOIN jobs j ON j.id=a.job_id
            JOIN (SELECT application_id,MIN(created_at) first_at FROM application_status_history
              WHERE to_status='ASSESSMENT' GROUP BY application_id) h ON h.application_id=a.id
            WHERE %s AND h.first_at BETWEEN :fromDate AND :toDate
            """.formatted(SCOPE), userId, from, to); }
    public Object averageResponseHours(long userId, Instant from, Instant to) { return scalar("""
            SELECT AVG(TIMESTAMPDIFF(HOUR,a.created_at,h.first_at)) FROM applications a JOIN jobs j ON j.id=a.job_id
            JOIN (SELECT application_id,MIN(created_at) first_at FROM application_status_history
              WHERE from_status IS NOT NULL AND to_status<>'NEW' GROUP BY application_id) h ON h.application_id=a.id
            WHERE %s AND h.first_at BETWEEN :fromDate AND :toDate
            """.formatted(SCOPE), userId, from, to); }
    public long countAcceptedOffers(long userId, Instant from, Instant to) { return countOffers(userId,from,to,"o.status='ACCEPTED'"); }
    public long countDecidedOffers(long userId, Instant from, Instant to) { return countOffers(userId,from,to,"o.status IN ('ACCEPTED','DECLINED','EXPIRED')"); }
    private long countOffers(long userId, Instant from, Instant to, String condition) { return count(("""
            SELECT COUNT(*) FROM offers o JOIN applications a ON a.id=o.application_id JOIN jobs j ON j.id=a.job_id
            WHERE %s AND %s AND o.updated_at BETWEEN :fromDate AND :toDate
            """).formatted(SCOPE, condition),userId,from,to); }
    public long countHired(long userId, Instant from, Instant to) { return count("""
            SELECT COUNT(*) FROM applications a JOIN jobs j ON j.id=a.job_id
            WHERE %s AND a.status='HIRED' AND a.updated_at BETWEEN :fromDate AND :toDate
            """.formatted(SCOPE),userId,from,to); }
    public long countApplications(long userId, Instant from, Instant to) { return count("""
            SELECT COUNT(*) FROM applications a JOIN jobs j ON j.id=a.job_id
            WHERE %s AND a.created_at BETWEEN :fromDate AND :toDate
            """.formatted(SCOPE),userId,from,to); }

    private long count(String sql, long userId, Instant from, Instant to) {
        Object value = query(sql, userId, from, to).getSingleResult();
        return value == null ? 0 : ((Number) value).longValue();
    }

    private Object scalar(String sql, long userId, Instant from, Instant to) {
        return query(sql, userId, from, to).getSingleResult();
    }

    @SuppressWarnings("unchecked")
    private List<Object[]> rows(String sql, long userId, Instant from, Instant to) {
        return query(sql, userId, from, to).getResultList();
    }

    private Query query(String sql, long userId, Instant from, Instant to) {
        Query query = entityManager.createNativeQuery(sql).setParameter("userId", userId);
        if (sql.contains(":fromDate")) query.setParameter("fromDate", from);
        if (sql.contains(":toDate")) query.setParameter("toDate", to);
        return query;
    }
}
