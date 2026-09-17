package com.smarthire.tenant.cv.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.smarthire.common.redis.RedisKeys;
import com.smarthire.common.redis.RedisService;
import com.smarthire.domain.tenant.entity.Cv;
import com.smarthire.domain.tenant.entity.CvExtraction;
import com.smarthire.domain.tenant.entity.CvSkill;
import com.smarthire.domain.tenant.entity.JobSkill;
import com.smarthire.domain.tenant.entity.MatchScore;
import com.smarthire.domain.tenant.repository.CvExtractionRepository;
import com.smarthire.domain.tenant.repository.CvSkillRepository;
import com.smarthire.domain.tenant.repository.JobSkillRepository;
import com.smarthire.domain.tenant.repository.MatchScoreRepository;
import com.smarthire.tenant.matching.service.SkillScoringService;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Job-fit screening for a CV of one job. Rank-v1 overall scoring stays in Matching. */
@Service
public class CvMatchingService {
    public static final String HEURISTIC_SCREEN = "heuristic-screen";
    private final JobSkillRepository jobSkills;
    private final CvSkillRepository cvSkills;
    private final CvExtractionRepository extractions;
    private final MatchScoreRepository scores;
    private final SkillScoringService skillScoring;
    private final ObjectMapper mapper;
    private final RedisService redis;
    private final long cacheSeconds;

    public CvMatchingService(
            JobSkillRepository jobSkills,
            CvSkillRepository cvSkills,
            CvExtractionRepository extractions,
            MatchScoreRepository scores,
            SkillScoringService skillScoring,
            ObjectMapper mapper,
            RedisService redis,
            @Value("${app.redis.ttl.match-score-seconds:1800}") long cacheSeconds) {
        this.jobSkills = jobSkills;
        this.cvSkills = cvSkills;
        this.extractions = extractions;
        this.scores = scores;
        this.skillScoring = skillScoring;
        this.mapper = mapper;
        this.redis = redis;
        this.cacheSeconds = cacheSeconds;
    }

    @Transactional
    public MatchScore score(Cv cv) {
        List<JobSkill> requirements = jobSkills.findByJob_IdOrderByIdAsc(cv.getJob().getId());
        List<CvSkill> candidateSkills = cvSkills.findByCv_Id(cv.getId());
        CvExtraction extraction = extractions.findByCv_Id(cv.getId()).orElse(null);
        JsonNode root = read(extraction == null ? null : extraction.getExtractionJson());
        JsonNode screening = root.path("screening");

        Set<String> have = new LinkedHashSet<>();
        for (CvSkill skill : candidateSkills) {
            String name = skill.getSkill() == null ? skill.getSkillName() : skill.getSkill().getName();
            have.add(skillScoring.normalize(name));
        }

        ObjectNode breakdown = mapper.createObjectNode();
        ArrayNode matched = breakdown.putArray("matched");
        ArrayNode missing = breakdown.putArray("missing");
        ArrayNode requiredMissing = breakdown.putArray("requiredMissing");
        int hits = 0;
        for (JobSkill requirement : requirements) {
            String required = skillScoring.normalize(requirement.getSkill().getName());
            boolean hit = have.contains(required);
            if (hit) hits++;
            ObjectNode row = mapper.createObjectNode();
            row.put("required", requirement.getSkill().getName());
            row.put("candidate", hit ? requirement.getSkill().getName() : null);
            row.put("similarity", hit ? 1 : 0);
            row.put("mandatory", requirement.isRequired());
            if (hit) matched.add(row);
            else {
                missing.add(row);
                if (requirement.isRequired()) requiredMissing.add(requirement.getSkill().getName());
            }
        }

        BigDecimal coverage = requirements.isEmpty()
                ? BigDecimal.ZERO
                : BigDecimal.valueOf(hits * 100L).divide(BigDecimal.valueOf(requirements.size()), 2, RoundingMode.HALF_UP);
        BigDecimal score = coverage;
        String verdict = heuristicVerdict(cv.getJob().getTitle(), hits, requirements.size(), requiredMissing);
        String model = HEURISTIC_SCREEN;
        if (screening.has("score") && screening.get("score").isNumber()) {
            score = BigDecimal.valueOf(screening.get("score").asDouble()).setScale(2, RoundingMode.HALF_UP);
            if (score.signum() < 0) score = BigDecimal.ZERO;
            if (score.compareTo(BigDecimal.valueOf(100)) > 0) score = BigDecimal.valueOf(100);
            if (screening.path("verdict").isTextual()) verdict = screening.path("verdict").asText();
            if (extraction != null && extraction.getModelVersion() != null) model = extraction.getModelVersion();
        }

        breakdown.put("skillScore", coverage);
        breakdown.put("verdict", verdict);
        breakdown.put("explanation", verdict);
        breakdown.put("source", model.startsWith("gemini") ? "gemini" : "heuristic");

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
        return saved;
    }

    private static String heuristicVerdict(String title, int hits, int total, ArrayNode missing) {
        String job = title == null || title.isBlank() ? "job" : title;
        if (total == 0) return "Job chưa có skill yêu cầu để sàng lọc.";
        String miss = missing.size() == 0 ? "không thiếu skill bắt buộc" : "thiếu: " + missing.toString();
        return "Sàng lọc CV cho " + job + ": khớp " + hits + "/" + total + " skill yêu cầu; " + miss
                + ". Điểm này là đánh giá hồ sơ so với JD, không phải điểm Matching sau assessment/interview.";
    }

    private JsonNode read(String json) {
        try {
            return mapper.readTree(json == null || json.isBlank() ? "{}" : json);
        } catch (Exception ex) {
            return mapper.createObjectNode();
        }
    }
}
