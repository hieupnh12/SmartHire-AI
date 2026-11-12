package com.smarthire.domain.tenant.repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import java.time.Instant;
import java.util.List;
import org.springframework.stereotype.Repository;

@Repository
public class RecruiterAnalyticsRepository {
    private static final String GLOBAL_SCOPE = """
            j.deleted_at IS NULL AND a.archived_at IS NULL AND
            (a.assignee_id = :userId OR (a.assignee_id IS NULL AND
              (j.created_by = :userId OR EXISTS (SELECT 1 FROM job_assignments ja
                WHERE ja.job_id = j.id AND ja.user_id = :userId AND ja.can_view = TRUE))))
            """;
    private static final String JOB_SCOPE = "a.job_id = :jobId AND j.deleted_at IS NULL AND a.archived_at IS NULL";
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

    private static String scope(Long jobId) {
        return jobId != null ? JOB_SCOPE : GLOBAL_SCOPE;
    }

    public long countCvsToScreen(long userId, Long jobId, Instant from, Instant to) {
        return count("""
                SELECT COUNT(*) FROM cvs c
                JOIN applications a ON a.id = c.application_id
                JOIN jobs j ON j.id = a.job_id
                WHERE {SCOPE} AND c.status IN ('UPLOADED', 'PARSED')
                  AND a.status IN ('NEW', 'IN_REVIEW')
                  AND c.created_at BETWEEN :fromDate AND :toDate
                """.replace("{SCOPE}", scope(jobId)), userId, jobId, from, to);
    }

    public long countOverdue(long userId, Long jobId, Instant from, Instant to) {
        return count("""
                SELECT COUNT(*) FROM applications a
                JOIN jobs j ON j.id = a.job_id
                WHERE {SCOPE} AND a.status NOT IN ('HIRED', 'REJECTED', 'FAILED', 'WITHDRAWN')
                  AND TIMESTAMPDIFF(MINUTE, a.updated_at, CURRENT_TIMESTAMP) > {SLA}
                """.replace("{SCOPE}", scope(jobId)).replace("{SLA}", SLA), userId, jobId, from, to);
    }

    public long countPendingReviews(long userId, Long jobId, Instant from, Instant to) {
        return count("""
                SELECT COUNT(*) FROM submissions s
                JOIN applications a ON a.id = s.application_id
                JOIN jobs j ON j.id = a.job_id
                WHERE {SCOPE} AND s.status IN ('SUBMITTED', 'PENDING', 'GRADING')
                  AND s.created_at BETWEEN :fromDate AND :toDate
                """.replace("{SCOPE}", scope(jobId)), userId, jobId, from, to);
    }

    public long countUpcomingInterviews(long userId, Long jobId, Instant from, Instant to) {
        return count("""
                SELECT COUNT(*) FROM interview_schedules sch
                JOIN interviews iv ON iv.id = sch.interview_id
                JOIN applications a ON a.id = iv.application_id
                JOIN jobs j ON j.id = a.job_id
                WHERE {SCOPE} AND sch.status IN ('PROPOSED', 'CONFIRMED')
                  AND sch.scheduled_start BETWEEN CURRENT_TIMESTAMP AND DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 48 HOUR)
                """.replace("{SCOPE}", scope(jobId)), userId, jobId, from, to);
    }

    public long countJobHiredAllTime(long jobId) {
        return count("""
                SELECT COUNT(*) FROM applications a
                JOIN jobs j ON j.id = a.job_id
                WHERE a.job_id = :jobId AND j.deleted_at IS NULL AND a.archived_at IS NULL
                  AND a.status = 'HIRED'
                """, 0L, jobId, null, null);
    }

    public long countJobPendingOffersAllTime(long jobId) {
        return count("""
                SELECT COUNT(*) FROM applications a
                JOIN jobs j ON j.id = a.job_id
                WHERE a.job_id = :jobId AND j.deleted_at IS NULL AND a.archived_at IS NULL
                  AND a.status = 'OFFER'
                """, 0L, jobId, null, null);
    }

    public long countJobAllTimeApplications(long jobId) {
        return count("""
                SELECT COUNT(*) FROM applications a
                JOIN jobs j ON j.id = a.job_id
                WHERE a.job_id = :jobId AND j.deleted_at IS NULL AND a.archived_at IS NULL
                """, 0L, jobId, null, null);
    }

    public List<Object[]> findJobAttention(long userId, Long jobId, Instant from, Instant to) {
        return rows("""
                SELECT j.id, j.title, COUNT(a.id), COALESCE(MAX(rs.name), a.status),
                  SUM(CASE WHEN a.status NOT IN ('HIRED', 'REJECTED', 'FAILED', 'WITHDRAWN')
                    AND TIMESTAMPDIFF(MINUTE, a.updated_at, CURRENT_TIMESTAMP) > {SLA} THEN 1 ELSE 0 END)
                FROM applications a
                JOIN jobs j ON j.id = a.job_id
                LEFT JOIN recruitment_stages rs ON rs.id = a.stage_id
                WHERE {SCOPE} AND a.created_at BETWEEN :fromDate AND :toDate
                GROUP BY j.id, j.title, a.status
                ORDER BY 5 DESC, 3 DESC
                """.replace("{SCOPE}", scope(jobId)).replace("{SLA}", SLA), userId, jobId, from, to);
    }

    public List<Object[]> findPipeline(long userId, Long jobId, Instant from, Instant to) {
        return rows("""
                SELECT a.status, COUNT(*) FROM applications a
                JOIN jobs j ON j.id = a.job_id
                WHERE {SCOPE} AND a.created_at BETWEEN :fromDate AND :toDate
                GROUP BY a.status
                """.replace("{SCOPE}", scope(jobId)), userId, jobId, from, to);
    }

    public List<Object[]> findReachedStages(long userId, Long jobId, Instant from, Instant to) {
        String s = scope(jobId);
        return rows("""
                SELECT t.stage_code, COUNT(DISTINCT t.app_id) FROM (
                  SELECT a.id AS app_id, a.status AS stage_code
                  FROM applications a JOIN jobs j ON j.id = a.job_id
                  WHERE {SCOPE} AND a.created_at BETWEEN :fromDate AND :toDate
                    AND a.status IN ('NEW','IN_REVIEW','ASSESSMENT','INTERVIEW','HUMAN_INTERVIEW','OFFER','HIRED')
                  UNION ALL
                  SELECT a.id AS app_id, h.to_status AS stage_code
                  FROM application_status_history h
                  JOIN applications a ON a.id = h.application_id
                  JOIN jobs j ON j.id = a.job_id
                  WHERE {SCOPE} AND a.created_at BETWEEN :fromDate AND :toDate
                    AND h.to_status IN ('NEW','IN_REVIEW','ASSESSMENT','INTERVIEW','HUMAN_INTERVIEW','OFFER','HIRED')
                  UNION ALL
                  SELECT a.id AS app_id, h.from_status AS stage_code
                  FROM application_status_history h
                  JOIN applications a ON a.id = h.application_id
                  JOIN jobs j ON j.id = a.job_id
                  WHERE {SCOPE} AND a.created_at BETWEEN :fromDate AND :toDate
                    AND h.from_status IN ('NEW','IN_REVIEW','ASSESSMENT','INTERVIEW','HUMAN_INTERVIEW','OFFER','HIRED')
                ) t
                GROUP BY t.stage_code
                """.replace("{SCOPE}", s), userId, jobId, from, to);
    }

    public List<Object[]> findStageDropOffs(long userId, Long jobId, Instant from, Instant to) {
        return rows("""
                SELECT t.drop_stage,
                       SUM(CASE WHEN t.status = 'REJECTED' THEN 1 ELSE 0 END),
                       SUM(CASE WHEN t.status = 'FAILED' THEN 1 ELSE 0 END),
                       SUM(CASE WHEN t.status = 'WITHDRAWN' THEN 1 ELSE 0 END)
                FROM (
                  SELECT a.status,
                         COALESCE(
                           (SELECT h.from_status FROM application_status_history h
                            WHERE h.application_id = a.id
                              AND h.to_status IN ('REJECTED', 'FAILED', 'WITHDRAWN')
                              AND h.from_status IN ('NEW','IN_REVIEW','ASSESSMENT','INTERVIEW','HUMAN_INTERVIEW','OFFER')
                            ORDER BY h.id DESC LIMIT 1),
                           'NEW'
                         ) AS drop_stage
                  FROM applications a
                  JOIN jobs j ON j.id = a.job_id
                  WHERE {SCOPE} AND a.created_at BETWEEN :fromDate AND :toDate
                    AND a.status IN ('REJECTED', 'FAILED', 'WITHDRAWN')
                ) t
                GROUP BY t.drop_stage
                """.replace("{SCOPE}", scope(jobId)), userId, jobId, from, to);
    }

    public List<Object[]> findStageTransitions(long userId, Long jobId, Instant from, Instant to) {
        return rows("""
                SELECT a.id, a.status, a.created_at, h.from_status, h.to_status, h.created_at
                FROM applications a
                JOIN jobs j ON j.id = a.job_id
                LEFT JOIN application_status_history h ON h.application_id = a.id
                WHERE {SCOPE} AND a.created_at BETWEEN :fromDate AND :toDate
                ORDER BY a.id ASC, h.created_at ASC, h.id ASC
                """.replace("{SCOPE}", scope(jobId)), userId, jobId, from, to);
    }

    public long countActiveJobs(long userId, Long jobId, Instant from, Instant to) {
        return count("""
                SELECT COUNT(DISTINCT j.id) FROM applications a
                JOIN jobs j ON j.id = a.job_id
                WHERE {SCOPE} AND j.status = 'PUBLISHED'
                  AND a.created_at BETWEEN :fromDate AND :toDate
                """.replace("{SCOPE}", scope(jobId)), userId, jobId, from, to);
    }

    public List<Object[]> findSlaAlerts(long userId, Long jobId, Instant from, Instant to) {
        return rows("""
                SELECT a.status, COUNT(*),
                       TIMESTAMPDIFF(MINUTE, MIN(a.updated_at), CURRENT_TIMESTAMP),
                       {SLA} AS threshold_minutes
                FROM applications a
                JOIN jobs j ON j.id = a.job_id
                WHERE {SCOPE} AND a.status NOT IN ('HIRED', 'REJECTED', 'FAILED', 'WITHDRAWN')
                  AND TIMESTAMPDIFF(MINUTE, a.updated_at, CURRENT_TIMESTAMP) > {SLA}
                GROUP BY a.status, threshold_minutes
                ORDER BY 2 DESC
                """.replace("{SCOPE}", scope(jobId)).replace("{SLA}", SLA), userId, jobId, from, to);
    }

    public List<Object[]> findSourceQuality(long userId, Long jobId, Instant from, Instant to) {
        return rows("""
                SELECT COALESCE(NULLIF(UPPER(TRIM(a.source)), ''), 'OTHER'),
                       COUNT(*),
                       AVG(os.overall),
                       SUM(CASE WHEN a.status = 'HIRED' THEN 1 ELSE 0 END)
                FROM applications a
                JOIN jobs j ON j.id = a.job_id
                LEFT JOIN overall_scores os ON os.application_id = a.id
                WHERE {SCOPE} AND a.created_at BETWEEN :fromDate AND :toDate
                GROUP BY COALESCE(NULLIF(UPPER(TRIM(a.source)), ''), 'OTHER')
                ORDER BY 2 DESC
                """.replace("{SCOPE}", scope(jobId)), userId, jobId, from, to);
    }

    public List<Object[]> findApplicationTrend(long userId, Long jobId, Instant from, Instant to, String granularity) {
        String periodExpr = periodExpression("a.created_at", granularity);
        return rows("""
                SELECT t.period,
                       COUNT(*),
                       SUM(CASE WHEN t.status = 'HIRED' THEN 1 ELSE 0 END),
                       AVG(t.overall_score)
                FROM (
                  SELECT {PERIOD} AS period, a.status, os.overall AS overall_score
                  FROM applications a
                  JOIN jobs j ON j.id = a.job_id
                  LEFT JOIN overall_scores os ON os.application_id = a.id
                  WHERE {SCOPE} AND a.created_at BETWEEN :fromDate AND :toDate
                ) t
                GROUP BY t.period
                ORDER BY t.period ASC
                """.replace("{PERIOD}", periodExpr).replace("{SCOPE}", scope(jobId)), userId, jobId, from, to);
    }

    public List<Object[]> findQualitySnapshotTrend(long userId, Long jobId, Instant from, Instant to, String granularity) {
        String periodExpr = periodExpression("cqs.calculated_at", granularity);
        return rows("""
                SELECT t.period, AVG(t.score)
                FROM (
                  SELECT {PERIOD} AS period, cqs.score
                  FROM candidate_quality_snapshots cqs
                  JOIN applications a ON a.id = cqs.application_id
                  JOIN jobs j ON j.id = a.job_id
                  WHERE {SCOPE} AND cqs.calculated_at BETWEEN :fromDate AND :toDate
                ) t
                GROUP BY t.period
                ORDER BY t.period ASC
                """.replace("{PERIOD}", periodExpr).replace("{SCOPE}", scope(jobId)), userId, jobId, from, to);
    }

    public Object averageQuality(long userId, Long jobId, Instant from, Instant to) {
        return scalar("""
                SELECT AVG(os.overall) FROM applications a
                JOIN jobs j ON j.id = a.job_id
                JOIN overall_scores os ON os.application_id = a.id
                WHERE {SCOPE} AND a.created_at BETWEEN :fromDate AND :toDate
                """.replace("{SCOPE}", scope(jobId)), userId, jobId, from, to);
    }

    public List<Object[]> findOverallScoreRows(long userId, Long jobId, Instant from, Instant to) {
        return rows("""
                SELECT os.overall, NULL
                FROM applications a
                JOIN jobs j ON j.id = a.job_id
                JOIN overall_scores os ON os.application_id = a.id
                WHERE {SCOPE} AND a.created_at BETWEEN :fromDate AND :toDate
                """.replace("{SCOPE}", scope(jobId)), userId, jobId, from, to);
    }

    public List<Object[]> findCvMatchScoreRows(long userId, Long jobId, Instant from, Instant to) {
        return rows("""
                SELECT MAX(ms.score), MAX(CASE WHEN gs.id IS NULL THEN NULL WHEN gs.passed = TRUE THEN 1 ELSE 0 END)
                FROM applications a
                JOIN jobs j ON j.id = a.job_id
                JOIN cvs c ON c.application_id = a.id
                JOIN match_scores ms ON ms.cv_id = c.id AND ms.job_id = a.job_id
                LEFT JOIN gate_scores gs ON gs.application_id = a.id
                WHERE {SCOPE} AND a.created_at BETWEEN :fromDate AND :toDate
                GROUP BY a.id
                """.replace("{SCOPE}", scope(jobId)), userId, jobId, from, to);
    }

    public List<Object[]> findAssessmentScoreRows(long userId, Long jobId, Instant from, Instant to) {
        return rows("""
                SELECT LEAST(100, GREATEST(0, (s.score * 100.0) /
                         NULLIF((SELECT SUM(q.points) FROM questions q WHERE q.test_id = t.id), 0))),
                       CASE WHEN t.passing_score IS NULL THEN NULL
                            WHEN s.score >= t.passing_score THEN 1 ELSE 0 END
                FROM submissions s
                JOIN tests t ON t.id = s.test_id
                JOIN applications a ON a.id = s.application_id
                JOIN jobs j ON j.id = a.job_id
                WHERE {SCOPE} AND a.created_at BETWEEN :fromDate AND :toDate
                  AND s.status IN ('COMPLETED', 'GRADED') AND s.score IS NOT NULL
                  AND s.id = (
                    SELECT MAX(s2.id) FROM submissions s2
                    WHERE s2.application_id = a.id
                      AND s2.status IN ('COMPLETED', 'GRADED')
                      AND s2.score IS NOT NULL
                  )
                """.replace("{SCOPE}", scope(jobId)), userId, jobId, from, to);
    }

    public List<Object[]> findAiInterviewScoreRows(long userId, Long jobId, Instant from, Instant to) {
        return rows("""
                SELECT ai.overall_score,
                       CASE WHEN COALESCE(ai.passing_score_snapshot, j.ai_interview_passing_score) IS NULL THEN NULL
                            WHEN ai.overall_score >= COALESCE(ai.passing_score_snapshot, j.ai_interview_passing_score) THEN 1 ELSE 0 END
                FROM ai_interviews ai
                JOIN applications a ON a.id = ai.application_id
                JOIN jobs j ON j.id = a.job_id
                WHERE {SCOPE} AND a.created_at BETWEEN :fromDate AND :toDate
                  AND ai.overall_score IS NOT NULL
                  AND ai.id = (
                    SELECT MAX(ai2.id) FROM ai_interviews ai2
                    WHERE ai2.application_id = a.id AND ai2.overall_score IS NOT NULL
                  )
                """.replace("{SCOPE}", scope(jobId)), userId, jobId, from, to);
    }

    public Object averageShortlistHours(long userId, Long jobId, Instant from, Instant to) {
        return scalar("""
                SELECT AVG(TIMESTAMPDIFF(HOUR, a.created_at, h.first_at))
                FROM applications a
                JOIN jobs j ON j.id = a.job_id
                JOIN (
                  SELECT application_id, MIN(created_at) AS first_at
                  FROM application_status_history
                  WHERE to_status = 'ASSESSMENT'
                  GROUP BY application_id
                ) h ON h.application_id = a.id
                WHERE {SCOPE} AND h.first_at BETWEEN :fromDate AND :toDate
                """.replace("{SCOPE}", scope(jobId)), userId, jobId, from, to);
    }

    public Object averageResponseHours(long userId, Long jobId, Instant from, Instant to) {
        return scalar("""
                SELECT AVG(TIMESTAMPDIFF(HOUR, a.created_at, h.first_at))
                FROM applications a
                JOIN jobs j ON j.id = a.job_id
                JOIN (
                  SELECT application_id, MIN(created_at) AS first_at
                  FROM application_status_history
                  WHERE from_status IS NOT NULL AND to_status <> 'NEW'
                  GROUP BY application_id
                ) h ON h.application_id = a.id
                WHERE {SCOPE} AND h.first_at BETWEEN :fromDate AND :toDate
                """.replace("{SCOPE}", scope(jobId)), userId, jobId, from, to);
    }

    public long countAcceptedOffers(long userId, Long jobId, Instant from, Instant to) {
        return countOffers(userId, jobId, from, to, "o.status = 'ACCEPTED'");
    }

    public long countDecidedOffers(long userId, Long jobId, Instant from, Instant to) {
        return countOffers(userId, jobId, from, to, "o.status IN ('ACCEPTED', 'DECLINED', 'EXPIRED')");
    }

    private long countOffers(long userId, Long jobId, Instant from, Instant to, String condition) {
        return count("""
                SELECT COUNT(*) FROM offers o
                JOIN applications a ON a.id = o.application_id
                JOIN jobs j ON j.id = a.job_id
                WHERE {SCOPE} AND {COND} AND o.updated_at BETWEEN :fromDate AND :toDate
                """.replace("{SCOPE}", scope(jobId)).replace("{COND}", condition), userId, jobId, from, to);
    }

    public long countHired(long userId, Long jobId, Instant from, Instant to) {
        return count("""
                SELECT COUNT(*) FROM applications a
                JOIN jobs j ON j.id = a.job_id
                WHERE {SCOPE} AND a.status = 'HIRED' AND a.updated_at BETWEEN :fromDate AND :toDate
                """.replace("{SCOPE}", scope(jobId)), userId, jobId, from, to);
    }

    public long countApplications(long userId, Long jobId, Instant from, Instant to) {
        return count("""
                SELECT COUNT(*) FROM applications a
                JOIN jobs j ON j.id = a.job_id
                WHERE {SCOPE} AND a.created_at BETWEEN :fromDate AND :toDate
                """.replace("{SCOPE}", scope(jobId)), userId, jobId, from, to);
    }

    public List<Object[]> findJobCvSkills(long jobId, Instant from, Instant to) {
        return rows("""
                SELECT a.id, COALESCE(sk.name, cs.skill_name)
                FROM applications a
                JOIN jobs j ON j.id = a.job_id
                JOIN cvs c ON c.application_id = a.id
                JOIN cv_skills cs ON cs.cv_id = c.id
                LEFT JOIN skills sk ON sk.id = cs.skill_id
                WHERE a.job_id = :jobId AND j.deleted_at IS NULL AND a.archived_at IS NULL
                  AND a.created_at BETWEEN :fromDate AND :toDate
                  AND c.id = (SELECT MAX(c2.id) FROM cvs c2 WHERE c2.application_id = a.id)
                """, 0L, jobId, from, to);
    }

    public List<Object[]> findJobCvAnalysisSkills(long jobId, Instant from, Instant to) {
        return rows("""
                SELECT a.id, ca.skills_json
                FROM applications a
                JOIN jobs j ON j.id = a.job_id
                JOIN cvs c ON c.application_id = a.id
                JOIN cv_analyses ca ON ca.cv_id = c.id
                WHERE a.job_id = :jobId AND j.deleted_at IS NULL AND a.archived_at IS NULL
                  AND a.created_at BETWEEN :fromDate AND :toDate
                  AND c.id = (SELECT MAX(c2.id) FROM cvs c2 WHERE c2.application_id = a.id)
                """, 0L, jobId, from, to);
    }

    public List<Object[]> findJobLossStatusesAndReasons(long jobId, Instant from, Instant to) {
        return rows("""
                SELECT a.status, a.reject_reason, a.withdraw_reason
                FROM applications a
                JOIN jobs j ON j.id = a.job_id
                WHERE a.job_id = :jobId AND j.deleted_at IS NULL AND a.archived_at IS NULL
                  AND a.created_at BETWEEN :fromDate AND :toDate
                  AND a.status IN ('REJECTED', 'FAILED', 'WITHDRAWN')
                """, 0L, jobId, from, to);
    }

    public long countFinishedSubmissionsForJob(long jobId, Instant from, Instant to) {
        return count("""
                SELECT COUNT(DISTINCT s.id)
                FROM submissions s
                JOIN applications a ON a.id = s.application_id
                JOIN jobs j ON j.id = a.job_id
                WHERE a.job_id = :jobId AND j.deleted_at IS NULL AND a.archived_at IS NULL
                  AND a.created_at BETWEEN :fromDate AND :toDate
                  AND s.status IN ('SUBMITTED', 'PENDING', 'GRADING', 'COMPLETED', 'GRADED', 'FAILED', 'EXPIRED')
                """, 0L, jobId, from, to);
    }

    public List<Object> findProctorReportRiskScores(long jobId, Instant from, Instant to) {
        return scalars("""
                SELECT pr.risk_score
                FROM proctor_reports pr
                JOIN submissions s ON s.id = pr.submission_id
                JOIN applications a ON a.id = s.application_id
                JOIN jobs j ON j.id = a.job_id
                WHERE a.job_id = :jobId AND j.deleted_at IS NULL AND a.archived_at IS NULL
                  AND a.created_at BETWEEN :fromDate AND :toDate
                """, 0L, jobId, from, to);
    }

    public List<Object[]> findProctorEventCounts(long jobId, Instant from, Instant to) {
        return rows("""
                SELECT pe.event_type, COUNT(*)
                FROM proctor_events pe
                JOIN submissions s ON s.id = pe.submission_id
                JOIN applications a ON a.id = s.application_id
                JOIN jobs j ON j.id = a.job_id
                WHERE a.job_id = :jobId AND j.deleted_at IS NULL AND a.archived_at IS NULL
                  AND a.created_at BETWEEN :fromDate AND :toDate
                GROUP BY pe.event_type
                ORDER BY 2 DESC
                """, 0L, jobId, from, to);
    }

    public List<Object[]> findHumanInterviewEvaluations(long jobId, Instant from, Instant to) {
        return rows("""
                SELECT ie.technical_score, ie.communication_score, ie.culture_score, ie.overall_score, ie.recommendation
                FROM interview_evaluations ie
                JOIN interviews iv ON iv.id = ie.interview_id
                JOIN applications a ON a.id = iv.application_id
                JOIN jobs j ON j.id = a.job_id
                WHERE a.job_id = :jobId AND j.deleted_at IS NULL AND a.archived_at IS NULL
                  AND a.created_at BETWEEN :fromDate AND :toDate
                """, 0L, jobId, from, to);
    }

    public List<Object[]> findAiInterviewStats(long jobId, Instant from, Instant to) {
        return rows("""
                SELECT ai.status, ai.overall_score, COALESCE(ai.passing_score_snapshot, j.ai_interview_passing_score)
                FROM ai_interviews ai
                JOIN applications a ON a.id = ai.application_id
                JOIN jobs j ON j.id = a.job_id
                WHERE a.job_id = :jobId AND j.deleted_at IS NULL AND a.archived_at IS NULL
                  AND a.created_at BETWEEN :fromDate AND :toDate
                """, 0L, jobId, from, to);
    }

    private static String periodExpression(String column, String granularity) {
        return switch (granularity) {
            case "MONTH" -> "DATE_FORMAT(" + column + ", '%Y-%m')";
            case "WEEK" -> "DATE_FORMAT(DATE_SUB(DATE(" + column + "), INTERVAL WEEKDAY(" + column + ") DAY), '%Y-%m-%d')";
            default -> "DATE_FORMAT(" + column + ", '%Y-%m-%d')";
        };
    }

    private long count(String sql, long userId, Long jobId, Instant from, Instant to) {
        Object value = query(sql, userId, jobId, from, to).getSingleResult();
        return value == null ? 0 : ((Number) value).longValue();
    }

    private Object scalar(String sql, long userId, Long jobId, Instant from, Instant to) {
        return query(sql, userId, jobId, from, to).getSingleResult();
    }

    @SuppressWarnings("unchecked")
    private List<Object[]> rows(String sql, long userId, Long jobId, Instant from, Instant to) {
        return query(sql, userId, jobId, from, to).getResultList();
    }

    @SuppressWarnings("unchecked")
    private List<Object> scalars(String sql, long userId, Long jobId, Instant from, Instant to) {
        return query(sql, userId, jobId, from, to).getResultList();
    }

    private Query query(String sql, long userId, Long jobId, Instant from, Instant to) {
        Query query = entityManager.createNativeQuery(sql);
        if (sql.contains(":userId")) query.setParameter("userId", userId);
        if (sql.contains(":jobId")) query.setParameter("jobId", jobId);
        if (sql.contains(":fromDate")) query.setParameter("fromDate", from);
        if (sql.contains(":toDate")) query.setParameter("toDate", to);
        return query;
    }
}
