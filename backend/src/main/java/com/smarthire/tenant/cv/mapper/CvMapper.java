package com.smarthire.tenant.cv.mapper;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.domain.tenant.entity.Cv;
import com.smarthire.domain.tenant.entity.CvAnalysis;
import com.smarthire.domain.tenant.entity.CvExtraction;
import com.smarthire.domain.tenant.entity.CvSkill;
import com.smarthire.domain.tenant.entity.MatchScore;
import com.smarthire.tenant.cv.dto.CvModels.AnalysisView;
import com.smarthire.tenant.cv.dto.CvModels.CvDetail;
import com.smarthire.tenant.cv.dto.CvModels.CvSummary;
import com.smarthire.tenant.cv.dto.CvModels.MatchView;
import com.smarthire.tenant.cv.dto.CvModels.SkillView;
import com.smarthire.tenant.matching.service.SkillScoringService;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class CvMapper {
    private final ObjectMapper mapper;
    private final SkillScoringService skills;

    public CvMapper(ObjectMapper mapper, SkillScoringService skills) {
        this.mapper = mapper;
        this.skills = skills;
    }

    public CvSummary summary(Cv cv, MatchScore score) {
        return new CvSummary(
                cv.getId(),
                cv.getJob().getId(),
                cv.getUser().getId(),
                cv.getUser().getFullName(),
                cv.getOriginalFilename(),
                cv.getStatus().name(),
                score == null ? null : score.getScore(),
                cv.getErrorCode(),
                cv.getCreatedAt());
    }

    public CvDetail detail(Cv cv, CvExtraction extraction, List<CvSkill> skillRows, CvAnalysis analysis,
                           MatchScore score, boolean includeMatch) {
        return new CvDetail(
                cv.getId(),
                cv.getJob().getId(),
                cv.getUser().getId(),
                cv.getApplication() == null ? null : cv.getApplication().getId(),
                cv.getUser().getFullName(),
                cv.getOriginalFilename(),
                cv.getMimeType(),
                cv.getFileSize(),
                cv.getStatus().name(),
                cv.getErrorCode(),
                cv.getErrorMessage(),
                cv.getCreatedAt(),
                json(extraction == null ? null : extraction.getExtractionJson()),
                extraction == null ? null : extraction.getModelVersion(),
                skillRows.stream().map(this::skill).toList(),
                analysis == null ? null : new AnalysisView(
                        analysis.getSummary(), analysis.getYearsExperience(),
                        analysis.getModelVersion(), analysis.getPromptVersion()),
                includeMatch && score != null
                        ? new MatchView(score.getJob().getId(), score.getCv().getId(), score.getScore(),
                        json(score.getBreakdownJson()), score.getModelVersion())
                        : null);
    }

    private SkillView skill(CvSkill row) {
        String canonical = skills.normalize(row.getSkill() == null ? row.getSkillName() : row.getSkill().getName());
        String category = row.getSkill() == null ? null : row.getSkill().getCategory();
        return new SkillView(row.getSkillName(), canonical, category, row.getConfidence());
    }

    private JsonNode json(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return mapper.readTree(value);
        } catch (Exception ex) {
            return mapper.getNodeFactory().textNode(value);
        }
    }
}
