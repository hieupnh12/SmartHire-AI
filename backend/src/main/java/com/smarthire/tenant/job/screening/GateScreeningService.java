package com.smarthire.tenant.job.screening;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.smarthire.domain.enums.AiInterviewStatus;
import com.smarthire.domain.enums.TestSubmissionStatus;
import com.smarthire.domain.tenant.entity.AiInterview;
import com.smarthire.domain.tenant.entity.Application;
import com.smarthire.domain.tenant.entity.Cv;
import com.smarthire.domain.tenant.entity.GateScore;
import com.smarthire.domain.tenant.entity.JobScreeningConfig;
import com.smarthire.domain.tenant.entity.MatchScore;
import com.smarthire.domain.tenant.entity.Submission;
import com.smarthire.domain.tenant.repository.GateScoreRepository;
import com.smarthire.domain.tenant.repository.MatchScoreRepository;
import com.smarthire.domain.tenant.repository.RankingDataRepository;
import com.smarthire.tenant.applicant.dto.ApplicantModels.GateScoreView;
import com.smarthire.tenant.applicant.dto.ApplicantModels.RoundItemView;
import com.smarthire.tenant.applicant.dto.ApplicantModels.ScreeningRoundsView;
import com.smarthire.tenant.cv.service.CvMatchingService;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class GateScreeningService {
    private static final BigDecimal HUNDRED = new BigDecimal("100");

    private final JobScreeningConfigService screening;
    private final RankingDataRepository ranking;
    private final MatchScoreRepository matches;
    private final GateScoreRepository gates;
    private final ObjectMapper mapper;

    public GateScreeningService(
            JobScreeningConfigService screening,
            RankingDataRepository ranking,
            MatchScoreRepository matches,
            GateScoreRepository gates,
            ObjectMapper mapper) {
        this.screening = screening;
        this.ranking = ranking;
        this.matches = matches;
        this.gates = gates;
        this.mapper = mapper;
    }

    @Transactional
    public GateScore recalculate(Application application) {
        if (application == null || application.getId() == null || application.getJob() == null) return null;
        JobScreeningConfig config = screening.require(application.getJob().getId());
        BigDecimal cvWeight = nz(config.getGateCvWeight());
        BigDecimal interviewWeight = nz(config.getGateInterviewWeight());
        BigDecimal assessmentWeight = nz(config.getGateAssessmentWeight());
        BigDecimal threshold = nz(config.getGatePassThreshold());

        MatchScore match = latestMatch(application);
        AiInterview interview = latestInterview(application.getId());
        Submission assessment = latestAssessment(application.getId());

        boolean cvPresent = match != null && match.getScore() != null;
        boolean interviewPresent = interview != null && interview.getOverallScore() != null;
        boolean assessmentPresent = assessment != null && assessment.getScore() != null;
        BigDecimal cvScore = cvPresent ? match.getScore() : BigDecimal.ZERO;
        BigDecimal interviewScore = interviewPresent ? interview.getOverallScore() : BigDecimal.ZERO;
        BigDecimal assessmentScore = assessmentPresent ? assessment.getScore() : BigDecimal.ZERO;

        BigDecimal score = weighted(cvScore, cvWeight)
                .add(weighted(interviewScore, interviewWeight))
                .add(weighted(assessmentScore, assessmentWeight))
                .setScale(2, RoundingMode.HALF_UP);
        boolean complete = presentOrUnused(cvWeight, cvPresent)
                && presentOrUnused(interviewWeight, interviewPresent)
                && presentOrUnused(assessmentWeight, assessmentPresent);
        boolean passed = complete && score.compareTo(threshold) >= 0;

        ObjectNode breakdown = mapper.createObjectNode();
        breakdown.put("cvScore", cvScore);
        breakdown.put("aiInterviewScore", interviewScore);
        breakdown.put("assessmentScore", assessmentScore);
        breakdown.put("cvPresent", cvPresent);
        breakdown.put("aiInterviewPresent", interviewPresent);
        breakdown.put("assessmentPresent", assessmentPresent);
        breakdown.put("complete", complete);
        breakdown.put("passed", passed);
        breakdown.put("passThreshold", threshold);
        ObjectNode weights = breakdown.putObject("weights");
        weights.put("cv", cvWeight);
        weights.put("aiInterview", interviewWeight);
        weights.put("assessment", assessmentWeight);

        GateScore saved = gates.findByApplication_Id(application.getId()).orElseGet(GateScore::new);
        saved.setApplication(application);
        saved.setScore(score);
        saved.setBreakdownJson(breakdown.toString());
        saved.setPassed(passed);
        return gates.save(saved);
    }

    @Transactional(readOnly = true)
    public ScreeningRoundsView rounds(Application application) {
        if (application == null || application.getId() == null || application.getJob() == null) return null;
        JobScreeningConfig config = screening.require(application.getJob().getId());
        MatchScore match = latestMatch(application);
        AiInterview interview = latestInterviewAny(application.getId());
        Submission assessment = latestAssessmentAny(application.getId());
        boolean cvPassed = CvMatchingService.passed(match);
        return new ScreeningRoundsView(
                new RoundItemView(
                        match == null ? "MISSING" : (cvPassed ? "PASSED" : "FAILED"),
                        match == null ? null : match.getScore(),
                        config.getCvPassThreshold(),
                        match == null ? null : cvPassed,
                        null),
                new RoundItemView(
                        interview == null
                                ? (application.getAiInterviewInvitedAt() != null ? "INVITED" : "MISSING")
                                : interview.getStatus().name(),
                        interview == null ? null : interview.getOverallScore(),
                        null,
                        interview != null && interview.getStatus() == AiInterviewStatus.SCORED ? Boolean.TRUE : null,
                        config.getGateInterviewWeight()),
                new RoundItemView(
                        assessment == null ? "MISSING" : assessment.getStatus().name(),
                        assessment == null ? null : assessment.getScore(),
                        null,
                        assessment != null && assessment.getStatus() == TestSubmissionStatus.GRADED ? Boolean.TRUE : null,
                        config.getGateAssessmentWeight()),
                application.getAiInterviewInvitedAt());
    }

    @Transactional(readOnly = true)
    public GateScoreView view(Application application) {
        if (application == null || application.getId() == null) return null;
        GateScore row = gates.findByApplication_Id(application.getId()).orElse(null);
        if (row == null) return null;
        JobScreeningConfig config = screening.require(application.getJob().getId());
        return toView(row, config);
    }

    public static GateScoreView toView(GateScore row, JobScreeningConfig config) {
        if (row == null) return null;
        return new GateScoreView(
                row.getScore(),
                row.isPassed(),
                complete(row.getBreakdownJson()),
                decimal(row.getBreakdownJson(), "cvScore"),
                decimal(row.getBreakdownJson(), "aiInterviewScore"),
                decimal(row.getBreakdownJson(), "assessmentScore"),
                config == null ? null : config.getGateCvWeight(),
                config == null ? null : config.getGateInterviewWeight(),
                config == null ? null : config.getGateAssessmentWeight(),
                config == null ? null : config.getGatePassThreshold());
    }

    private MatchScore latestMatch(Application application) {
        List<Cv> cvs = ranking.cvs(application.getId());
        for (int i = cvs.size() - 1; i >= 0; i--) {
            Cv cv = cvs.get(i);
            MatchScore score = matches.findByJob_IdAndCv_Id(application.getJob().getId(), cv.getId()).orElse(null);
            if (score != null) return score;
        }
        return null;
    }

    private AiInterview latestInterviewAny(long applicationId) {
        List<AiInterview> interviews = ranking.aiInterviews(applicationId);
        return interviews.isEmpty() ? null : interviews.get(interviews.size() - 1);
    }

    private Submission latestAssessmentAny(long applicationId) {
        List<Submission> submissions = ranking.submissions(applicationId);
        return submissions.isEmpty() ? null : submissions.get(submissions.size() - 1);
    }

    private AiInterview latestInterview(long applicationId) {
        List<AiInterview> interviews = ranking.aiInterviews(applicationId);
        for (int i = interviews.size() - 1; i >= 0; i--) {
            AiInterview interview = interviews.get(i);
            if (interview.getId() == null || interview.getStatus() != AiInterviewStatus.SCORED) continue;
            if (interview.getOverallScore() != null) return interview;
        }
        return null;
    }

    private Submission latestAssessment(long applicationId) {
        List<Submission> submissions = ranking.submissions(applicationId);
        for (int i = submissions.size() - 1; i >= 0; i--) {
            Submission submission = submissions.get(i);
            if (submission.getId() == null || submission.getStatus() != TestSubmissionStatus.GRADED) continue;
            if (submission.getScore() != null) return submission;
        }
        return null;
    }

    private static boolean presentOrUnused(BigDecimal weight, boolean present) {
        return weight == null || weight.signum() == 0 || present;
    }

    private static BigDecimal weighted(BigDecimal component, BigDecimal weight) {
        if (component == null || weight == null || weight.signum() <= 0) return BigDecimal.ZERO;
        return component.multiply(weight).divide(HUNDRED, 4, RoundingMode.HALF_UP);
    }

    private static BigDecimal nz(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    private static boolean complete(String json) {
        try {
            return json != null && new ObjectMapper().readTree(json).path("complete").asBoolean(false);
        } catch (Exception ex) {
            return false;
        }
    }

    private static BigDecimal decimal(String json, String field) {
        try {
            var node = new ObjectMapper().readTree(json == null ? "{}" : json).path(field);
            return node.isNumber() ? node.decimalValue() : null;
        } catch (Exception ex) {
            return null;
        }
    }
}
