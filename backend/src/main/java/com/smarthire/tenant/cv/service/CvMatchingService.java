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
import com.smarthire.domain.tenant.entity.JobScreeningConfig;
import com.smarthire.domain.tenant.repository.MatchScoreRepository;
import com.smarthire.tenant.job.screening.JobScreeningConfigService;
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

    private static final BigDecimal HUNDRED = new BigDecimal("100");
    private static final BigDecimal HALF = new BigDecimal("0.5");

    private final JobSkillRepository jobSkills;
    private final CvSkillRepository cvSkills;
    private final CvExtractionRepository extractions;
    private final CvAnalysisRepository analyses;
    private final MatchScoreRepository scores;
    private final SkillScoringService skillScoring;
    private final JobScreeningConfigService jobScreening;
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
            JobScreeningConfigService jobScreening,
            ObjectMapper mapper,
            RedisService redis,
            @Value("${app.redis.ttl.match-score-seconds:1800}") long cacheSeconds) {
        this.jobSkills = jobSkills;
        this.cvSkills = cvSkills;
        this.extractions = extractions;
        this.analyses = analyses;
        this.scores = scores;
        this.skillScoring = skillScoring;
        this.jobScreening = jobScreening;
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
        BigDecimal educationScore = educationScore(cv.getJob().getEducationLevel(), root);
        boolean hasGeminiRows = semanticCount > 0;
        BigDecimal semanticScore = hasGeminiRows ? average(semanticSum, semanticCount) : requiredScore;

        JobScreeningConfig config = jobScreening.require(cv.getJob().getId());
        BigDecimal configuredRequired = nz(config.getCvSkillWeight());
        BigDecimal configuredPreferred = nz(config.getCvPreferredWeight());
        BigDecimal configuredExperience = nz(config.getCvExperienceWeight());
        BigDecimal configuredEducation = nz(config.getCvEducationWeight());
        BigDecimal configuredJaccard = nz(config.getCvJaccardWeight());
        BigDecimal configuredSemantic = nz(config.getCvSemanticWeight());
        BigDecimal passThreshold = nz(config.getCvPassThreshold());

        boolean hasPreferred = preferredCount > 0;
        boolean hasExperience = hasExperienceRequirement(cv.getJob().getMinYearsExperience());
        boolean hasEducation = hasEducationRequirement(cv.getJob().getEducationLevel());

        BigDecimal wRequired = configuredRequired;
        BigDecimal wPreferred = hasPreferred ? configuredPreferred : BigDecimal.ZERO;
        BigDecimal wExperience = hasExperience ? configuredExperience : BigDecimal.ZERO;
        BigDecimal wEducation = hasEducation ? configuredEducation : BigDecimal.ZERO;
        BigDecimal wSemantic = hasGeminiRows ? configuredSemantic : BigDecimal.ZERO;
        BigDecimal wJaccard = configuredJaccard;
        if (!hasPreferred) wRequired = wRequired.add(configuredPreferred);
        if (!hasExperience) wRequired = wRequired.add(configuredExperience);
        if (!hasEducation) wRequired = wRequired.add(configuredEducation);
        if (!hasGeminiRows) wRequired = wRequired.add(configuredSemantic);

        BigDecimal score = weighted(requiredScore, wRequired)
                .add(weighted(preferredScore, wPreferred))
                .add(weighted(jaccardScore, wJaccard))
                .add(weighted(experienceScore, wExperience))
                .add(weighted(educationScore, wEducation))
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
        boolean passed = passed(score, passThreshold, requiredMissing.size(), requirements.size(), hasGeminiRows || geminiExtraction);

        breakdown.put("skillScore", requiredScore);
        breakdown.put("jaccardSimilarity", jaccard);
        breakdown.put("verdict", verdict);
        breakdown.put("explanation", verdict);
        breakdown.put("source", model.equals(HYBRID_SCREEN) ? "hybrid" : "heuristic");
        breakdown.put("passed", passed);
        breakdown.put("passThreshold", passThreshold);

        ObjectNode weights = breakdown.putObject("weights");
        weights.put("required", wRequired);
        weights.put("preferred", wPreferred);
        weights.put("jaccard", wJaccard);
        weights.put("experience", wExperience);
        weights.put("education", wEducation);
        weights.put("semantic", wSemantic);

        ObjectNode components = breakdown.putObject("components");
        components.put("required", requiredScore);
        components.put("preferred", hasPreferred ? preferredScore : null);
        components.put("jaccard", jaccardScore);
        components.put("experience", hasExperience ? experienceScore : null);
        components.put("education", hasEducation ? educationScore : null);
        components.put("semantic", semanticScore);

        ObjectNode experience = breakdown.putObject("experienceAnalysis");
        BigDecimal requiredYears = cv.getJob().getMinYearsExperience();
        BigDecimal candidateYears = analysis == null ? null : analysis.getYearsExperience();
        if (requiredYears == null) experience.putNull("requiredYears");
        else experience.put("requiredYears", requiredYears);
        if (candidateYears == null) experience.putNull("candidateYears");
        else experience.put("candidateYears", candidateYears);
        experience.put("match", !hasExperience || experienceScore.compareTo(HUNDRED) >= 0);

        ObjectNode education = breakdown.putObject("educationAnalysis");
        if (!hasEducation) education.putNull("requiredLevel");
        else education.put("requiredLevel", cv.getJob().getEducationLevel());
        String candidateEducation = highestEducationLabel(root);
        if (candidateEducation.isBlank()) education.putNull("candidateLevel");
        else education.put("candidateLevel", candidateEducation);
        education.put("match", !hasEducation || educationScore.compareTo(HUNDRED) >= 0);

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
            if (root.has("passThreshold") && root.path("passThreshold").isNumber()) {
                return score.getScore().compareTo(root.path("passThreshold").decimalValue()) >= 0;
            }
        } catch (Exception ignored) {
            // Missing or unreadable breakdown is not a pass.
        }
        return false;
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

    private static boolean passed(BigDecimal score, BigDecimal threshold, int requiredMissing, int totalRequirements, boolean geminiScore) {
        if (score == null || threshold == null || score.compareTo(threshold) < 0) return false;
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

    private static boolean hasEducationRequirement(String required) {
        return required != null && !required.isBlank();
    }

    static BigDecimal educationScore(String requiredLevel, JsonNode extraction) {
        if (!hasEducationRequirement(requiredLevel)) return BigDecimal.ZERO;
        int needed = educationRank(requiredLevel);
        int have = candidateEducationRank(extraction);
        if (needed <= 0) return BigDecimal.ZERO;
        if (have <= 0) return BigDecimal.ZERO;
        if (have >= needed) return HUNDRED;
        if (have == needed - 1) return new BigDecimal("50.00");
        return BigDecimal.ZERO;
    }

    private static String highestEducationLabel(JsonNode extraction) {
        if (extraction == null) return "";
        JsonNode education = extraction.path("education");
        String bestLabel = firstText(extraction, "highestEducation");
        int best = educationRank(bestLabel);
        if (education.isArray()) {
            for (JsonNode row : education) {
                String label = firstText(row, "degree", "level", "name");
                int rank = educationRank(label);
                if (rank >= best) {
                    best = rank;
                    if (!label.isBlank()) bestLabel = label;
                }
            }
        }
        return bestLabel;
    }

    private static int candidateEducationRank(JsonNode extraction) {
        if (extraction == null) return 0;
        JsonNode education = extraction.path("education");
        int best = 0;
        if (education.isArray()) {
            for (JsonNode row : education) {
                best = Math.max(best, educationRank(firstText(row, "degree", "level", "name")));
            }
        }
        best = Math.max(best, educationRank(extraction.path("highestEducation").asText("")));
        return best;
    }

    static int educationRank(String value) {
        if (value == null || value.isBlank()) return 0;
        String n = value.toLowerCase(java.util.Locale.ROOT);
        if (n.contains("tiến sĩ") || n.contains("tien si") || n.contains("phd") || n.contains("doctor")) return 5;
        if (n.contains("thạc") || n.contains("thac") || n.contains("master") || n.contains("msc") || n.contains("mba")) return 4;
        if (n.contains("đại học") || n.contains("dai hoc") || n.contains("cử nhân") || n.contains("cu nhan")
                || n.contains("bachelor") || n.contains("university") || n.contains("bsc") || n.contains("ba ")) return 3;
        if (n.contains("cao đẳng") || n.contains("cao dang") || n.contains("college") || n.contains("associate")) return 2;
        if (n.contains("trung học") || n.contains("trung hoc") || n.contains("high school") || n.contains("secondary")) return 1;
        return 0;
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

    private static BigDecimal weighted(BigDecimal component, BigDecimal weight) {
        if (weight == null || weight.signum() <= 0 || component == null) return BigDecimal.ZERO;
        return component.multiply(weight).divide(HUNDRED, 4, RoundingMode.HALF_UP);
    }

    private static BigDecimal nz(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
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
