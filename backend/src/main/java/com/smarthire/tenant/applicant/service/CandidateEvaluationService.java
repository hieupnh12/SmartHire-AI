package com.smarthire.tenant.applicant.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.enums.AiInterviewStatus;
import com.smarthire.domain.tenant.entity.AiInterview;
import com.smarthire.domain.tenant.entity.Application;
import com.smarthire.domain.tenant.entity.MatchScore;
import com.smarthire.domain.tenant.entity.Submission;
import com.smarthire.domain.tenant.repository.ApplicationRepository;
import com.smarthire.domain.tenant.repository.RankingDataRepository;
import com.smarthire.tenant.applicant.dto.ApplicantModels.AiInterviewEvaluationView;
import com.smarthire.tenant.applicant.dto.ApplicantModels.AssessmentEvaluationView;
import com.smarthire.tenant.applicant.dto.ApplicantModels.CandidateEvaluationView;
import com.smarthire.tenant.applicant.dto.ApplicantModels.CvEvaluationView;
import com.smarthire.tenant.cv.service.CvAccess;
import com.smarthire.tenant.cv.service.CvMatchingService;
import com.smarthire.tenant.job.screening.GateScreeningService;
import com.smarthire.tenant.job.screening.JobScreeningConfigService;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Summary-level evaluation reasons per round, as shown to the owning candidate. */
@Service
public class CandidateEvaluationService {
    private final ApplicationRepository applications;
    private final CvAccess access;
    private final RankingDataRepository ranking;
    private final GateScreeningService gateScreening;
    private final JobScreeningConfigService screening;
    private final ObjectMapper mapper;

    public CandidateEvaluationService(
            ApplicationRepository applications,
            CvAccess access,
            RankingDataRepository ranking,
            GateScreeningService gateScreening,
            JobScreeningConfigService screening,
            ObjectMapper mapper) {
        this.applications = applications;
        this.access = access;
        this.ranking = ranking;
        this.gateScreening = gateScreening;
        this.screening = screening;
        this.mapper = mapper;
    }

    @Transactional(readOnly = true)
    public CandidateEvaluationView evaluation(long applicationId) {
        Application application = applications.findById(applicationId).orElseThrow(CandidateEvaluationService::notFound);
        if (!access.candidate() || !application.getCandidate().getId().equals(access.actor().getId())) throw notFound();
        return new CandidateEvaluationView(cv(application), interviews(application), assessments(application));
    }

    private CvEvaluationView cv(Application application) {
        MatchScore match = gateScreening.latestMatch(application);
        if (match == null) return null;
        JsonNode breakdown = tree(match.getBreakdownJson());
        JsonNode experience = breakdown.path("experienceAnalysis");
        JsonNode education = breakdown.path("educationAnalysis");
        return new CvEvaluationView(
                match.getScore(),
                screening.require(application.getJob().getId()).getCvPassThreshold(),
                CvMatchingService.passed(match),
                text(breakdown.path("explanation")),
                requirementLabels(breakdown.path("matched")),
                requirementLabels(breakdown.path("partialMatches")),
                requirementLabels(breakdown.path("missing")),
                strings(breakdown.path("requiredMissing")),
                decimal(experience.path("requiredYears")),
                decimal(experience.path("candidateYears")),
                text(education.path("requiredLevel")),
                text(education.path("candidateLevel")));
    }

    private List<AiInterviewEvaluationView> interviews(Application application) {
        List<AiInterviewEvaluationView> rows = new ArrayList<>();
        for (AiInterview interview : ranking.aiInterviews(application.getId())) {
            JsonNode report = tree(interview.getReportJson());
            rows.add(0, new AiInterviewEvaluationView(
                    interview.getId(),
                    interview.getAttemptNumber(),
                    interview.getStatus().name(),
                    interview.getOverallScore(),
                    interview.getPassingScoreSnapshot(),
                    interviewPassed(interview),
                    interview.getCompletedAt(),
                    text(report.path("summary")),
                    text(report.path("strengths")),
                    text(report.path("weaknesses")),
                    criteria(report)));
        }
        return rows;
    }

    private List<AssessmentEvaluationView> assessments(Application application) {
        List<AssessmentEvaluationView> rows = new ArrayList<>();
        for (Submission submission : ranking.submissions(application.getId())) {
            BigDecimal threshold = submission.getTest().getPassingScore();
            Boolean passed = threshold == null || submission.getScore() == null ? null : submission.getScore().compareTo(threshold) >= 0;
            rows.add(0, new AssessmentEvaluationView(
                    submission.getId(),
                    submission.getTest().getTitle(),
                    submission.getStatus().name(),
                    submission.getScore(),
                    threshold,
                    passed,
                    submission.getSubmittedAt()));
        }
        return rows;
    }

    private static Boolean interviewPassed(AiInterview interview) {
        if (interview.getStatus() == AiInterviewStatus.PASSED) return true;
        if (interview.getStatus() == AiInterviewStatus.FAILED) return false;
        if (interview.getStatus() != AiInterviewStatus.SCORED || interview.getOverallScore() == null
                || interview.getPassingScoreSnapshot() == null) return null;
        return interview.getOverallScore().compareTo(interview.getPassingScoreSnapshot()) >= 0;
    }

    /** Content criteria when graded; otherwise competency group scores. Weights stay internal. */
    private static Map<String, BigDecimal> criteria(JsonNode report) {
        JsonNode source = report.path("communicationCriteria");
        if (!source.isObject() || source.isEmpty()) source = report.path("competencies");
        Map<String, BigDecimal> result = new LinkedHashMap<>();
        source.fields().forEachRemaining(entry -> {
            if (entry.getValue().isNumber()) result.put(entry.getKey(), entry.getValue().decimalValue());
        });
        return result;
    }

    private JsonNode tree(String json) {
        try {
            return json == null ? mapper.createObjectNode() : mapper.readTree(json);
        } catch (Exception ex) {
            return mapper.createObjectNode();
        }
    }

    private static List<String> requirementLabels(JsonNode rows) {
        List<String> labels = new ArrayList<>();
        rows.forEach(row -> { String label = text(row.path("requirement")); if (label != null) labels.add(label); });
        return labels;
    }

    private static List<String> strings(JsonNode values) {
        List<String> result = new ArrayList<>();
        values.forEach(value -> { String text = text(value); if (text != null) result.add(text); });
        return result;
    }

    private static String text(JsonNode node) {
        return node.isTextual() && !node.asText().isBlank() ? node.asText() : null;
    }

    private static BigDecimal decimal(JsonNode node) {
        return node.isNumber() ? node.decimalValue() : null;
    }

    private static BusinessException notFound() {
        return new BusinessException("Application not found", HttpStatus.NOT_FOUND, "APPLICATION_NOT_FOUND");
    }
}
