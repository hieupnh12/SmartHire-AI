package com.smarthire.tenant.cv.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.domain.tenant.entity.Cv;
import com.smarthire.domain.tenant.entity.CvAnalysis;
import com.smarthire.domain.tenant.entity.CvSkill;
import com.smarthire.domain.tenant.entity.Skill;
import com.smarthire.domain.tenant.repository.CvAnalysisRepository;
import com.smarthire.domain.tenant.repository.CvSkillRepository;
import com.smarthire.domain.tenant.repository.SkillRepository;
import com.smarthire.tenant.cv.ai.CvAiClient;
import com.smarthire.tenant.matching.service.SkillScoringService;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Service;

@Service
public class CvSkillAnalysisService {
    private final SkillRepository skills;
    private final CvSkillRepository cvSkills;
    private final CvAnalysisRepository analyses;
    private final SkillScoringService scoring;
    private final ObjectMapper mapper;
    private final CvAiClient ai;

    public CvSkillAnalysisService(
            SkillRepository skills,
            CvSkillRepository cvSkills,
            CvAnalysisRepository analyses,
            SkillScoringService scoring,
            ObjectMapper mapper,
            CvAiClient ai) {
        this.skills = skills;
        this.cvSkills = cvSkills;
        this.analyses = analyses;
        this.scoring = scoring;
        this.mapper = mapper;
        this.ai = ai;
    }

    public void analyze(Cv cv, String extractionJson) {
        JsonNode root = read(extractionJson);
        List<NamedSkill> extracted = collect(root);
        cvSkills.deleteAll(cvSkills.findByCv_Id(cv.getId()));
        for (NamedSkill item : extracted) {
            Skill skill = resolve(item.name());
            CvSkill row = new CvSkill();
            row.setCv(cv);
            row.setSkill(skill);
            row.setSkillName(item.name());
            row.setConfidence(item.confidence());
            cvSkills.save(row);
        }
        CvAnalysis analysis = analyses.findByCv_Id(cv.getId()).orElseGet(CvAnalysis::new);
        analysis.setCv(cv);
        analysis.setSkillsJson(toJson(extracted));
        analysis.setYearsExperience(years(root));
        analysis.setSummary(summary(extracted, analysis.getYearsExperience()));
        analysis.setRawJson(extractionJson);
        analysis.setModelVersion(ai.modelVersion());
        analysis.setPromptVersion(ai.promptVersion());
        analyses.save(analysis);
    }

    public Skill resolve(String rawName) {
        String canonical = scoring.normalize(rawName);
        return skills.findByNameIgnoreCase(canonical).orElseGet(() -> {
            Skill created = new Skill();
            created.setName(canonical);
            created.setCategory(scoring.category(stub(canonical)));
            if (!canonical.equalsIgnoreCase(rawName.trim())) {
                created.setAliasesJson("[\"%s\"]".formatted(rawName.replace("\"", "")));
            }
            return skills.save(created);
        });
    }

    private Skill stub(String name) {
        Skill skill = new Skill();
        skill.setName(name);
        return skill;
    }

    private List<NamedSkill> collect(JsonNode root) {
        Set<String> seen = new LinkedHashSet<>();
        List<NamedSkill> items = new ArrayList<>();
        for (JsonNode node : root.path("skills")) {
            add(items, seen, node.path("name").asText(node.asText()), node.path("confidence"));
        }
        for (JsonNode job : root.path("experience")) {
            for (JsonNode skill : job.path("skills")) add(items, seen, skill.asText(), null);
        }
        return items;
    }

    private void add(List<NamedSkill> items, Set<String> seen, String name, JsonNode confidence) {
        if (name == null || name.isBlank()) return;
        String key = scoring.normalize(name);
        if (key.isBlank() || !seen.add(key)) return;
        BigDecimal value = confidence != null && confidence.isNumber()
                ? BigDecimal.valueOf(confidence.asDouble()).setScale(2, RoundingMode.HALF_UP)
                : new BigDecimal("0.80");
        items.add(new NamedSkill(name.trim(), value));
    }

    private BigDecimal years(JsonNode root) {
        JsonNode experience = root.path("experience");
        if (!experience.isArray() || experience.isEmpty()) return BigDecimal.ZERO;
        try {
            long months = 0;
            YearMonth now = YearMonth.now();
            for (JsonNode job : experience) {
                YearMonth start = YearMonth.parse(job.path("startDate").asText());
                YearMonth end = job.path("current").asBoolean(false) ? now : YearMonth.parse(job.path("endDate").asText());
                months += Math.max(0, ChronoUnit.MONTHS.between(start, end) + 1);
            }
            return BigDecimal.valueOf(months).divide(BigDecimal.valueOf(12), 1, RoundingMode.HALF_UP);
        } catch (Exception ex) {
            return null;
        }
    }

    private String summary(List<NamedSkill> extracted, BigDecimal years) {
        String names = extracted.stream().map(NamedSkill::name).limit(8).reduce((a, b) -> a + ", " + b).orElse("none");
        String exp = years == null ? "unknown experience" : years + " years experience";
        return "Screening dataset: " + extracted.size() + " skills (" + names + "); " + exp + ".";
    }

    private String toJson(List<NamedSkill> extracted) {
        try {
            return mapper.writeValueAsString(extracted.stream().map(NamedSkill::name).toList());
        } catch (Exception ex) {
            return "[]";
        }
    }

    private JsonNode read(String json) {
        try {
            return mapper.readTree(json == null ? "{}" : json);
        } catch (Exception ex) {
            return mapper.createObjectNode();
        }
    }

    private record NamedSkill(String name, BigDecimal confidence) {}
}
