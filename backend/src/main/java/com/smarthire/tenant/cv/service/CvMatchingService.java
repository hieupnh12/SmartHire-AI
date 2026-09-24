package com.smarthire.tenant.cv.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.smarthire.common.redis.RedisKeys;
import com.smarthire.common.redis.RedisService;
import com.smarthire.domain.tenant.entity.Cv;
import com.smarthire.domain.tenant.entity.CvAnalysis;
import com.smarthire.domain.tenant.entity.CvExtraction;
import com.smarthire.domain.tenant.entity.CvSkill;
import com.smarthire.domain.tenant.entity.JobSkill;
import com.smarthire.domain.tenant.entity.MatchScore;
import com.smarthire.domain.tenant.repository.CvAnalysisRepository;
import com.smarthire.domain.tenant.repository.CvExtractionRepository;
import com.smarthire.domain.tenant.repository.CvSkillRepository;
import com.smarthire.domain.tenant.repository.JobSkillRepository;
import com.smarthire.domain.tenant.repository.MatchScoreRepository;
import com.smarthire.tenant.matching.service.SkillScoringService;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Hybrid CV screening: taxonomy + Jaccard + Gemini semantics. Gemini never sets the final score.
 * Rank-v1 overall (35/15/30/20) stays in Matching.
 */
@Service
public class CvMatchingService {
    private static final Logger log = LoggerFactory.getLogger(CvMatchingService.class);

    public static final String HEURISTIC_SCREEN = "heuristic-screen";
    public static final String HYBRID_SCREEN = "hybrid-v1";
    public static final BigDecimal PASS_THRESHOLD = new BigDecimal("60");

    /** Required skills dominate first-round filtering. */
    public static final int WEIGHT_REQUIRED = 40;
    /** Gemini semantic credit; redistributed to required when Gemini has no requirement rows. */
    public static final int WEIGHT_SEMANTIC = 25;
    /** Normalized set overlap after taxonomy. */
    public static final int WEIGHT_JACCARD = 15;
    /** Years vs job.minYearsExperience; redistributed when the job has no year requirement. */
    public static final int WEIGHT_EXPERIENCE = 12;
    /** Preferred (non-required) skills; redistributed when the job has none. */
    public static final int WEIGHT_PREFERRED = 8;

    private static final BigDecimal HUNDRED = new BigDecimal("100");
    private static final BigDecimal HALF = new BigDecimal("0.5");

    private final JobSkillRepository jobSkills;
    private final CvSkillRepository cvSkills;
    private final CvExtractionRepository extractions;
    private final CvAnalysisRepository analyses;
    private final MatchScoreRepository scores;
    private final SkillScoringService skillScoring;
    private final ObjectMapper mapper;
    private final RedisService redis;
    private final long cacheSeconds;

    public CvMatchingService(
            JobSkillRepository jobSkills,
            CvSkillRepository cvSkills,
            CvExtractionRepository extractions,
            CvAnalysisRepository analyses,
            MatchScoreRepository scores,
            SkillScoringService skillScoring,
            ObjectMapper mapper,
            RedisService redis,
            @Value("${app.redis.ttl.match-score-seconds:1800}") long cacheSeconds) {
        this.jobSkills = jobSkills;
        this.cvSkills = cvSkills;
        this.extractions = extractions;
        this.analyses = analyses;
        this.scores = scores;
        this.skillScoring = skillScoring;
        this.mapper = mapper;
        this.redis = redis;
        this.cacheSeconds = cacheSeconds;
    }

    @Transactional
    public MatchScore score(Cv cv) {
        if (cv.getJob() == null) {
            throw new IllegalStateException("CV has no job to match");
        }
        List<JobSkill> requirements = jobSkills.findByJob_IdOrderByIdAsc(cv.getJob().getId());
        List<CvSkill> candidateSkills = cvSkills.findByCv_Id(cv.getId());
        CvExtraction extraction = extractions.findByCv_Id(cv.getId()).orElse(null);
        CvAnalysis analysis = analyses.findByCv_Id(cv.getId()).orElse(null);
        JsonNode root = read(extraction == null ? null : extraction.getExtractionJson());
        JsonNode screening = root.path("screening");
        Map<String, SemanticHit> semantic = semanticIndex(screening);

        Set<String> have = new LinkedHashSet<>();
        for (CvSkill skill : candidateSkills) {
            String name = skill.getSkill() == null ? skill.getSkillName() : skill.getSkill().getName();
            String normalized = skillScoring.normalize(name);
            if (!normalized.isBlank()) have.add(normalized);
        }
        Set<String> needed = new LinkedHashSet<>();
        for (JobSkill requirement : requirements) {
            String normalized = skillScoring.normalize(requirement.getSkill().getName());
            if (!normalized.isBlank()) needed.add(normalized);
        }

        BigDecimal jaccard = jaccard(have, needed);
        ObjectNode breakdown = mapper.createObjectNode();
        ArrayNode matched = breakdown.putArray("matched");
        ArrayNode partialMatches = breakdown.putArray("partialMatches");
        ArrayNode missing = breakdown.putArray("missing");
        ArrayNode requiredMissing = breakdown.putArray("requiredMissing");

        BigDecimal requiredSum = BigDecimal.ZERO;
        int requiredCount = 0;
        BigDecimal preferredSum = BigDecimal.ZERO;
        int preferredCount = 0;
        BigDecimal semanticSum = BigDecimal.ZERO;
        int semanticCount = 0;

        for (JobSkill requirement : requirements) {
            String label = requirement.getSkill().getName();
            String key = skillScoring.normalize(label);
            boolean exact = have.contains(key);
            SemanticHit ai = semantic.get(key);
            String status = resolveStatus(exact, ai);
            String matchType = resolveMatchType(exact, ai);
            BigDecimal credit = credit(status);

            ObjectNode row = mapper.createObjectNode();
            row.put("requirement", label);
            row.put("required", label);
            row.put("candidate", exact ? label : (ai != null && !ai.evidence.isBlank() ? label : null));
            row.put("status", status);
            row.put("matchType", matchType);
            row.put("similarity", credit);
            row.put("mandatory", requirement.isRequired());
            row.put("evidence", evidence(status, exact, label, ai));
            if (ai != null && !ai.explanation.isBlank()) row.put("explanation", ai.explanation);

            if ("MATCH".equals(status)) matched.add(row);
            else if ("PARTIAL".equals(status)) partialMatches.add(row);
            else {
                missing.add(row);
                if (requirement.isRequired()) requiredMissing.add(label);
            }

            if (requirement.isRequired()) {
                requiredSum = requiredSum.add(credit);
                requiredCount++;
            } else {
                preferredSum = preferredSum.add(credit);
                preferredCount++;
            }
            if (ai != null) {
                semanticSum = semanticSum.add(credit(ai.status));
                semanticCount++;
            }
        }

        BigDecimal requiredScore = average(requiredSum, requiredCount);
        BigDecimal preferredScore = average(preferredSum, preferredCount);
        BigDecimal jaccardScore = pct(jaccard);
        BigDecimal experienceScore = experienceScore(cv.getJob().getMinYearsExperience(),
                analysis == null ? null : analysis.getYearsExperience());
        boolean hasGeminiRows = semanticCount > 0;
        BigDecimal semanticScore = hasGeminiRows ? average(semanticSum, semanticCount) : requiredScore;

        int wRequired = WEIGHT_REQUIRED;
        int wPreferred = preferredCount > 0 ? WEIGHT_PREFERRED : 0;
        int wExperience = hasExperienceRequirement(cv.getJob().getMinYearsExperience()) ? WEIGHT_EXPERIENCE : 0;
        int wSemantic = hasGeminiRows ? WEIGHT_SEMANTIC : 0;
        int wJaccard = WEIGHT_JACCARD;
        if (wPreferred == 0) wRequired += WEIGHT_PREFERRED;
        if (wExperience == 0) wRequired += WEIGHT_EXPERIENCE;
        if (wSemantic == 0) wRequired += WEIGHT_SEMANTIC;

        BigDecimal score = weighted(requiredScore, wRequired)
                .add(weighted(preferredScore, wPreferred))
                .add(weighted(jaccardScore, wJaccard))
                .add(weighted(experienceScore, wExperience))
                .add(weighted(semanticScore, wSemantic))
                .setScale(2, RoundingMode.HALF_UP);
        if (score.signum() < 0) score = BigDecimal.ZERO;
        if (score.compareTo(HUNDRED) > 0) score = HUNDRED;

        String verdict = screening.path("verdict").isTextual()
                ? screening.path("verdict").asText()
                : heuristicVerdict(cv.getJob().getTitle(), matched.size(), requirements.size(), requiredMissing);
        boolean geminiExtraction = extraction != null && extraction.getModelVersion() != null
                && extraction.getModelVersion().startsWith("gemini");
        String model = geminiExtraction || hasGeminiRows ? HYBRID_SCREEN : HEURISTIC_SCREEN;
        boolean passed = passed(score, requiredMissing.size(), requirements.size(), hasGeminiRows || geminiExtraction);

        breakdown.put("skillScore", requiredScore);
        breakdown.put("jaccardSimilarity", jaccard);
        breakdown.put("verdict", verdict);
        breakdown.put("explanation", verdict);
        breakdown.put("source", model.equals(HYBRID_SCREEN) ? "hybrid" : "heuristic");
        breakdown.put("passed", passed);
        breakdown.put("passThreshold", PASS_THRESHOLD);

        ObjectNode weights = breakdown.putObject("weights");
        weights.put("required", wRequired);
        weights.put("preferred", wPreferred);
        weights.put("jaccard", wJaccard);
        weights.put("experience", wExperience);
        weights.put("semantic", wSemantic);

        ObjectNode components = breakdown.putObject("components");
        components.put("required", requiredScore);
        components.put("preferred", preferredCount == 0 ? null : preferredScore);
        components.put("jaccard", jaccardScore);
        components.put("experience", wExperience == 0 ? null : experienceScore);
        components.put("semantic", semanticScore);

        ObjectNode experience = breakdown.putObject("experienceAnalysis");
        BigDecimal requiredYears = cv.getJob().getMinYearsExperience();
        BigDecimal candidateYears = analysis == null ? null : analysis.getYearsExperience();
        if (requiredYears == null) experience.putNull("requiredYears");
        else experience.put("requiredYears", requiredYears);
        if (candidateYears == null) experience.putNull("candidateYears");
        else experience.put("candidateYears", candidateYears);
        experience.put("match", wExperience == 0 || experienceScore.compareTo(HUNDRED) >= 0);

        MatchScore saved = scores.findByJob_IdAndCv_Id(cv.getJob().getId(), cv.getId()).orElseGet(MatchScore::new);
        saved.setJob(cv.getJob());
        saved.setCv(cv);
        saved.setScore(score);
        saved.setBreakdownJson(breakdown.toString());
        saved.setModelVersion(model);
        scores.save(saved);
        try {
            redis.set(RedisKeys.matchScore(cv.getJob().getId(), cv.getId()), breakdown.toString(), Duration.ofSeconds(cacheSeconds));
        } catch (Exception ex) {
            // Cache is optional.
        }
        log.info("CV {} job {} hybrid score={} jaccard={} passed={}", cv.getId(), cv.getJob().getId(), score, jaccard, passed);
        return saved;
    }

    public static boolean passed(MatchScore score) {
        if (score == null || score.getScore() == null || score.getBreakdownJson() == null) return false;
        try {
            JsonNode root = new ObjectMapper().readTree(score.getBreakdownJson());
            if (root.has("passed")) return root.path("passed").asBoolean(false);
        } catch (Exception ignored) {
            // Fall through to score-only rule.
        }
        return score.getScore().compareTo(PASS_THRESHOLD) >= 0;
    }

    /** J(A,B) = |A ∩ B| / |A ∪ B|. Empty sets → 0. */
    public static BigDecimal jaccard(Set<String> left, Set<String> right) {
        if (left == null || right == null || left.isEmpty() && right.isEmpty()) return BigDecimal.ZERO;
        Set<String> union = new LinkedHashSet<>(left);
        union.addAll(right);
        if (union.isEmpty()) return BigDecimal.ZERO;
        Set<String> intersection = new LinkedHashSet<>(left);
        intersection.retainAll(right);
        return BigDecimal.valueOf(intersection.size())
                .divide(BigDecimal.valueOf(union.size()), 4, RoundingMode.HALF_UP);
    }

    private static boolean passed(BigDecimal score, int requiredMissing, int totalRequirements, boolean geminiScore) {
        if (score == null || score.compareTo(PASS_THRESHOLD) < 0) return false;
        if (requiredMissing > 0) return false;
        if (totalRequirements == 0 && !geminiScore) return false;
        return true;
    }

    private static String resolveStatus(boolean exact, SemanticHit ai) {
        if (exact) return "MATCH";
        if (ai == null) return "MISSING";
        return switch (ai.status) {
            case "MATCH", "PARTIAL", "MISSING", "UNKNOWN" -> ai.status;
            default -> "MISSING";
        };
    }

    private static String resolveMatchType(boolean exact, SemanticHit ai) {
        boolean semantic = ai != null && ("MATCH".equals(ai.status) || "PARTIAL".equals(ai.status));
        if (exact && semantic) return "BOTH";
        if (exact) return "TAXONOMY";
        if (semantic) return "SEMANTIC";
        return "NONE";
    }

    private static BigDecimal credit(String status) {
        if ("MATCH".equals(status)) return BigDecimal.ONE;
        if ("PARTIAL".equals(status)) return HALF;
        return BigDecimal.ZERO;
    }

    private static String evidence(String status, boolean exact, String label, SemanticHit ai) {
        if (ai != null && !ai.evidence.isBlank()) return ai.evidence;
        if (exact) return "Normalized CV skill matches " + label + ".";
        if ("MISSING".equals(status) || "UNKNOWN".equals(status)) {
            return "No " + label + " experience found in the CV.";
        }
        return "";
    }

    private Map<String, SemanticHit> semanticIndex(JsonNode screening) {
        Map<String, SemanticHit> index = new HashMap<>();
        if (screening == null || screening.isMissingNode() || screening.isEmpty()) return index;
        addHits(index, screening.path("matched"), "MATCH");
        addHits(index, screening.path("partialMatches"), "PARTIAL");
        addHits(index, screening.path("partial"), "PARTIAL");
        addHits(index, screening.path("missing"), "MISSING");
        addHits(index, screening.path("unknown"), "UNKNOWN");
        return index;
    }

    private void addHits(Map<String, SemanticHit> index, JsonNode array, String defaultStatus) {
        if (!array.isArray()) return;
        for (JsonNode node : array) {
            String requirement = firstText(node, "requirement", "required");
            if (requirement.isBlank()) continue;
            String status = firstText(node, "status");
            if (status.isBlank()) status = defaultStatus;
            status = status.trim().toUpperCase();
            String evidence = firstText(node, "evidence", "reason");
            String explanation = firstText(node, "explanation");
            index.putIfAbsent(skillScoring.normalize(requirement), new SemanticHit(status, evidence, explanation));
        }
    }

    private static String firstText(JsonNode node, String... fields) {
        for (String field : fields) {
            if (node.path(field).isTextual()) return node.path(field).asText("").trim();
        }
        return "";
    }

    private static boolean hasExperienceRequirement(BigDecimal requiredYears) {
        return requiredYears != null && requiredYears.signum() > 0;
    }

    private static BigDecimal experienceScore(BigDecimal requiredYears, BigDecimal candidateYears) {
        if (!hasExperienceRequirement(requiredYears)) return BigDecimal.ZERO;
        if (candidateYears == null || candidateYears.signum() < 0) return BigDecimal.ZERO;
        return candidateYears.min(requiredYears)
                .divide(requiredYears, 4, RoundingMode.HALF_UP)
                .multiply(HUNDRED)
                .setScale(2, RoundingMode.HALF_UP);
    }

    private static BigDecimal average(BigDecimal sum, int count) {
        if (count <= 0) return BigDecimal.ZERO;
        return sum.multiply(HUNDRED).divide(BigDecimal.valueOf(count), 2, RoundingMode.HALF_UP);
    }

    private static BigDecimal pct(BigDecimal ratio) {
        return ratio.multiply(HUNDRED).setScale(2, RoundingMode.HALF_UP);
    }

    private static BigDecimal weighted(BigDecimal component, int weight) {
        if (weight <= 0) return BigDecimal.ZERO;
        return component.multiply(BigDecimal.valueOf(weight)).divide(HUNDRED, 4, RoundingMode.HALF_UP);
    }

    private static String heuristicVerdict(String title, int hits, int total, ArrayNode missing) {
        String job = title == null || title.isBlank() ? "job" : title;
        if (total == 0) return "Job chưa có skill yêu cầu để sàng lọc.";
        String miss = missing.size() == 0 ? "không thiếu skill bắt buộc" : "thiếu: " + missing.toString();
        return "Sàng lọc CV cho " + job + ": khớp " + hits + "/" + total + " skill yêu cầu; " + miss
                + ". Điểm hybrid (taxonomy + Jaccard + semantic), không phải điểm Matching sau assessment/interview.";
    }

    private JsonNode read(String json) {
        try {
            return mapper.readTree(json == null || json.isBlank() ? "{}" : json);
        } catch (Exception ex) {
            return mapper.createObjectNode();
        }
    }

    private record SemanticHit(String status, String evidence, String explanation) {}
}
