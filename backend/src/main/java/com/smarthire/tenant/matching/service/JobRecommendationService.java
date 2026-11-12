package com.smarthire.tenant.matching.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.enums.JobStatus;
import com.smarthire.domain.enums.UserStatus;
import com.smarthire.domain.tenant.entity.Candidate;
import com.smarthire.domain.tenant.entity.Cv;
import com.smarthire.domain.tenant.entity.CvAnalysis;
import com.smarthire.domain.tenant.entity.CvSkill;
import com.smarthire.domain.tenant.entity.Job;
import com.smarthire.domain.tenant.entity.JobSkill;
import com.smarthire.domain.tenant.entity.Recommendation;
import com.smarthire.domain.tenant.repository.ApplicationRepository;
import com.smarthire.domain.tenant.repository.CvAnalysisRepository;
import com.smarthire.domain.tenant.repository.CvRepository;
import com.smarthire.domain.tenant.repository.CvSkillRepository;
import com.smarthire.domain.tenant.repository.JobRepository;
import com.smarthire.domain.tenant.repository.JobSkillRepository;
import com.smarthire.domain.tenant.repository.RecommendationRepository;
import com.smarthire.tenant.cv.service.CvAccess;
import com.smarthire.tenant.job.mapper.JobMapper;
import com.smarthire.tenant.matching.dto.RecommendationModels.CandidateJobRecommendationPage;
import com.smarthire.tenant.matching.dto.RecommendationModels.CandidateRecommendationItem;
import com.smarthire.tenant.matching.dto.RecommendationModels.JobRecommendationItem;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class JobRecommendationService {

    private static final Logger log = LoggerFactory.getLogger(JobRecommendationService.class);
    private static final String SUBJECT_CANDIDATE = "CANDIDATE";
    private static final String SUBJECT_JOB = "JOB";
    private static final String TARGET_JOB = "JOB";
    private static final String TARGET_CANDIDATE = "CANDIDATE";
    private static final BigDecimal HALF_MATCH = new BigDecimal("0.50");
    private static final BigDecimal HUNDRED = new BigDecimal("100.00");

    private final CvAccess access;
    private final CvRepository cvs;
    private final CvSkillRepository cvSkills;
    private final CvAnalysisRepository cvAnalyses;
    private final JobRepository jobs;
    private final JobSkillRepository jobSkills;
    private final ApplicationRepository applications;
    private final RecommendationRepository recommendations;
    private final SkillScoringService skillScoring;
    private final JobMapper jobMapper;
    private final ObjectMapper json;

    public JobRecommendationService(
            CvAccess access,
            CvRepository cvs,
            CvSkillRepository cvSkills,
            CvAnalysisRepository cvAnalyses,
            JobRepository jobs,
            JobSkillRepository jobSkills,
            ApplicationRepository applications,
            RecommendationRepository recommendations,
            SkillScoringService skillScoring,
            JobMapper jobMapper,
            ObjectMapper json) {
        this.access = access;
        this.cvs = cvs;
        this.cvSkills = cvSkills;
        this.cvAnalyses = cvAnalyses;
        this.jobs = jobs;
        this.jobSkills = jobSkills;
        this.applications = applications;
        this.recommendations = recommendations;
        this.skillScoring = skillScoring;
        this.jobMapper = jobMapper;
        this.json = json;
    }

    @Transactional
    public CandidateJobRecommendationPage recommendJobsForCandidate(int limit) {
        Candidate candidate = access.candidateActor();
        if (candidate.getStatus() != UserStatus.ACTIVE) {
            throw new BusinessException("Tài khoản ứng viên không hoạt động", HttpStatus.FORBIDDEN, "CANDIDATE_INACTIVE");
        }
        int safeLimit = clampLimit(limit, 20);
        List<Cv> ownedCvs = cvs.findByCandidate_IdAndApplicationCopyFalseOrderByIdDesc(candidate.getId());
        CvProfile primaryCv = selectBestCvProfile(ownedCvs);
        if (primaryCv == null || primaryCv.skills().isEmpty()) {
            return new CandidateJobRecommendationPage(
                    primaryCv == null ? null : primaryCv.cv().getId(),
                    primaryCv == null ? null : primaryCv.cv().getOriginalFilename(),
                    false,
                    List.of());
        }

        List<Job> openJobs = jobs.publicOpen(Instant.now(), null, JobStatus.PUBLISHED);
        List<ScoredJob> scored = new ArrayList<>();
        for (Job job : openJobs) {
            List<JobSkill> required = jobSkills.findByJob_IdOrderByIdAsc(job.getId());
            MatchResult result = scoreCvAgainstJob(job, required, primaryCv);
            scored.add(new ScoredJob(job, required, result));
        }

        scored.sort(Comparator
                .comparing((ScoredJob item) -> item.match().score()).reversed()
                .thenComparing(item -> item.job().getPublishedAt(), Comparator.nullsLast(Comparator.reverseOrder()))
                .thenComparing(item -> item.job().getId(), Comparator.reverseOrder()));

        List<ScoredJob> top = scored.stream().limit(safeLimit).toList();
        persistCandidateJobSnapshots(candidate.getId(), primaryCv.cv().getId(), top);

        List<JobRecommendationItem> items = top.stream()
                .map(entry -> new JobRecommendationItem(
                        jobMapper.publicJob(entry.job(), entry.skills()),
                        entry.match().score(),
                        entry.match().matchedSkills(),
                        entry.match().missingSkills(),
                        entry.match().reasons()))
                .toList();

        return new CandidateJobRecommendationPage(
                primaryCv.cv().getId(),
                primaryCv.cv().getOriginalFilename(),
                true,
                items);
    }

    @Transactional
    public List<CandidateRecommendationItem> recommendCandidatesForJob(long jobId, int limit) {
        Job job = jobs.findWithOwnerById(jobId)
                .filter(j -> j.getDeletedAt() == null)
                .orElseThrow(() -> new BusinessException("Job not found", HttpStatus.NOT_FOUND, "JOB_NOT_FOUND"));
        access.requireJob(job);
        int safeLimit = clampLimit(limit, 30);

        List<JobSkill> required = jobSkills.findByJob_IdOrderByIdAsc(jobId);
        Set<Long> appliedCandidateIds = applications.findByJob_IdOrderByIdDesc(jobId).stream()
                .map(app -> app.getCandidate().getId())
                .collect(Collectors.toSet());

        Map<Long, List<Cv>> cvsByCandidate = new LinkedHashMap<>();
        for (Cv cv : cvs.findNonCopyForCandidatesWithStatus(UserStatus.ACTIVE)) {
            cvsByCandidate.computeIfAbsent(cv.getCandidate().getId(), ignored -> new ArrayList<>()).add(cv);
        }

        List<ScoredCandidate> scored = new ArrayList<>();
        for (Map.Entry<Long, List<Cv>> entry : cvsByCandidate.entrySet()) {
            CvProfile profile = selectBestCvProfile(entry.getValue());
            if (profile == null || profile.skills().isEmpty()) {
                continue;
            }
            Candidate cand = profile.cv().getCandidate();
            MatchResult match = scoreCvAgainstJob(job, required, profile);
            scored.add(new ScoredCandidate(cand, profile.cv(), match, appliedCandidateIds.contains(cand.getId())));
        }

        scored.sort(Comparator
                .comparing((ScoredCandidate item) -> item.match().score()).reversed()
                .thenComparing(item -> item.cv().getId(), Comparator.reverseOrder()));

        List<ScoredCandidate> top = scored.stream().limit(safeLimit).toList();
        persistJobCandidateSnapshots(jobId, top);

        return top.stream()
                .map(entry -> new CandidateRecommendationItem(
                        entry.candidate().getId(),
                        entry.candidate().getFullName(),
                        entry.candidate().getHeadline(),
                        entry.candidate().getAvatarUrl(),
                        entry.cv().getId(),
                        entry.cv().getOriginalFilename(),
                        entry.match().score(),
                        entry.match().matchedSkills(),
                        entry.match().missingSkills(),
                        entry.alreadyApplied(),
                        entry.match().reasons()))
                .toList();
    }

    private CvProfile selectBestCvProfile(List<Cv> candidateCvs) {
        if (candidateCvs == null || candidateCvs.isEmpty()) {
            return null;
        }
        CvProfile fallback = null;
        for (Cv cv : candidateCvs) {
            CvAnalysis analysis = cvAnalyses.findByCv_Id(cv.getId()).orElse(null);
            List<String> extractedSkills = collectCandidateSkills(cv.getId(), analysis);
            CvProfile profile = new CvProfile(cv, analysis, extractedSkills);
            if (!extractedSkills.isEmpty()) {
                return profile;
            }
            if (fallback == null) {
                fallback = profile;
            }
        }
        return fallback;
    }

    private List<String> collectCandidateSkills(long cvId, CvAnalysis analysis) {
        Set<String> seen = new LinkedHashSet<>();
        for (CvSkill row : cvSkills.findByCv_Id(cvId)) {
            String raw = row.getSkill() != null ? row.getSkill().getName() : row.getSkillName();
            if (StringUtils.hasText(raw)) {
                seen.add(skillScoring.normalize(raw));
            }
        }
        if (analysis != null && StringUtils.hasText(analysis.getSkillsJson())) {
            try {
                JsonNode node = json.readTree(analysis.getSkillsJson());
                if (node != null && node.isArray()) {
                    for (JsonNode element : node) {
                        String name = element.isTextual()
                                ? element.asText()
                                : element.path("name").asText(element.path("skill").asText(""));
                        if (StringUtils.hasText(name)) {
                            seen.add(skillScoring.normalize(name));
                        }
                    }
                }
            } catch (Exception ex) {
                log.debug("Ignoring malformed skills_json on cv {}", cvId);
            }
        }
        seen.removeIf(String::isEmpty);
        return List.copyOf(seen);
    }

    MatchResult scoreCvAgainstJob(Job job, List<JobSkill> requiredSkills, CvProfile profile) {
        List<String> matched = new ArrayList<>();
        List<String> missing = new ArrayList<>();
        List<String> reasons = new ArrayList<>();

        BigDecimal skillScore;
        boolean allRequiredMet = true;

        if (requiredSkills == null || requiredSkills.isEmpty()) {
            skillScore = fallbackTextOverlapScore(job, profile.skills(), matched);
        } else {
            BigDecimal weightedHit = BigDecimal.ZERO;
            BigDecimal totalWeight = BigDecimal.ZERO;
            for (JobSkill req : requiredSkills) {
                if (req.getSkill() == null || !StringUtils.hasText(req.getSkill().getName())) {
                    continue;
                }
                String reqName = req.getSkill().getName();
                BigDecimal baseWeight = req.getWeight() == null || req.getWeight().compareTo(BigDecimal.ZERO) <= 0
                        ? BigDecimal.ONE
                        : req.getWeight();
                BigDecimal effectiveWeight = req.isRequired() ? baseWeight.multiply(new BigDecimal("1.50")) : baseWeight;
                totalWeight = totalWeight.add(effectiveWeight);

                BigDecimal bestSim = BigDecimal.ZERO;
                for (String candSkill : profile.skills()) {
                    BigDecimal sim = skillScoring.similarity(reqName, candSkill);
                    if (sim.compareTo(bestSim) > 0) {
                        bestSim = sim;
                    }
                    if (bestSim.compareTo(BigDecimal.ONE) == 0) {
                        break;
                    }
                }
                weightedHit = weightedHit.add(bestSim.multiply(effectiveWeight));
                if (bestSim.compareTo(HALF_MATCH) >= 0) {
                    matched.add(reqName);
                } else {
                    missing.add(reqName);
                    if (req.isRequired()) {
                        allRequiredMet = false;
                    }
                }
            }
            skillScore = totalWeight.compareTo(BigDecimal.ZERO) == 0
                    ? BigDecimal.ZERO
                    : weightedHit.multiply(HUNDRED).divide(totalWeight, 2, RoundingMode.HALF_UP);
            reasons.add("SKILL_MATCH:" + matched.size() + "/" + (matched.size() + missing.size()));
            if (allRequiredMet && !matched.isEmpty()) {
                reasons.add("REQUIRED_SKILLS_MET");
            }
        }

        BigDecimal finalScore = skillScore;
        BigDecimal minYears = job.getMinYearsExperience();
        BigDecimal candYears = profile.analysis() == null ? null : profile.analysis().getYearsExperience();
        if (minYears != null && minYears.compareTo(BigDecimal.ZERO) > 0 && candYears != null) {
            BigDecimal ratio = candYears.divide(minYears, 4, RoundingMode.HALF_UP).min(BigDecimal.ONE);
            BigDecimal expScore = ratio.multiply(HUNDRED);
            finalScore = skillScore.multiply(new BigDecimal("0.85"))
                    .add(expScore.multiply(new BigDecimal("0.15")))
                    .setScale(2, RoundingMode.HALF_UP);
            reasons.add(candYears.compareTo(minYears) >= 0 ? "EXPERIENCE_MEETS_MIN" : "EXPERIENCE_BELOW_MIN");
        }

        BigDecimal clamped = finalScore.max(BigDecimal.ZERO).min(HUNDRED).setScale(2, RoundingMode.HALF_UP);
        return new MatchResult(clamped, List.copyOf(matched), List.copyOf(missing), List.copyOf(reasons));
    }

    private BigDecimal fallbackTextOverlapScore(Job job, List<String> candSkills, List<String> matchedOut) {
        String corpus = ((job.getTitle() == null ? "" : job.getTitle()) + " "
                + (job.getDescription() == null ? "" : job.getDescription())).toLowerCase(Locale.ROOT);
        for (String skill : candSkills) {
            if (!skill.isEmpty() && corpus.contains(skill)) {
                matchedOut.add(skill);
            }
        }
        if (candSkills.isEmpty() || matchedOut.isEmpty()) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        int capped = Math.min(60, matchedOut.size() * 15);
        return BigDecimal.valueOf(capped).setScale(2, RoundingMode.HALF_UP);
    }

    private void persistCandidateJobSnapshots(long candidateId, long cvId, List<ScoredJob> top) {
        recommendations.deleteBySubjectTypeAndSubjectIdAndTargetType(SUBJECT_CANDIDATE, candidateId, TARGET_JOB);
        List<Recommendation> rows = top.stream()
                .map(entry -> Recommendation.builder()
                        .subjectType(SUBJECT_CANDIDATE)
                        .subjectId(candidateId)
                        .targetType(TARGET_JOB)
                        .targetId(entry.job().getId())
                        .score(entry.match().score())
                        .reasonJson(reasonJson(cvId, entry.match()))
                        .build())
                .toList();
        if (!rows.isEmpty()) {
            recommendations.saveAll(rows);
        }
    }

    private void persistJobCandidateSnapshots(long jobId, List<ScoredCandidate> top) {
        recommendations.deleteBySubjectTypeAndSubjectIdAndTargetType(SUBJECT_JOB, jobId, TARGET_CANDIDATE);
        List<Recommendation> rows = top.stream()
                .map(entry -> Recommendation.builder()
                        .subjectType(SUBJECT_JOB)
                        .subjectId(jobId)
                        .targetType(TARGET_CANDIDATE)
                        .targetId(entry.candidate().getId())
                        .score(entry.match().score())
                        .reasonJson(reasonJson(entry.cv().getId(), entry.match()))
                        .build())
                .toList();
        if (!rows.isEmpty()) {
            recommendations.saveAll(rows);
        }
    }

    private String reasonJson(long cvId, MatchResult match) {
        try {
            return json.writeValueAsString(Map.of(
                    "cvId", cvId,
                    "matchedSkills", match.matchedSkills(),
                    "missingSkills", match.missingSkills(),
                    "reasons", match.reasons()));
        } catch (Exception ex) {
            return "{}";
        }
    }

    private static int clampLimit(int requested, int defaultVal) {
        int value = requested <= 0 ? defaultVal : requested;
        return Math.min(Math.max(value, 1), 50);
    }

    record CvProfile(Cv cv, CvAnalysis analysis, List<String> skills) {
    }

    record MatchResult(BigDecimal score, List<String> matchedSkills, List<String> missingSkills, List<String> reasons) {
    }

    private record ScoredJob(Job job, List<JobSkill> skills, MatchResult match) {
    }

    private record ScoredCandidate(Candidate candidate, Cv cv, MatchResult match, boolean alreadyApplied) {
    }
}

